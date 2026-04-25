/**
 * Repairs question.categoryId using examCode / exam when they map cleanly to an Exam category.
 *
 * Usage:
 *   $env:CONFIRM_REPAIR_QUESTION_CATEGORY="YES"; npx tsx scripts/repair-question-category-from-exam.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

type QuestionDoc = {
  _id: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId | string | null;
  exam?: string;
  examCode?: string;
  text?: { en?: string };
};

type ExamDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string | null;
  categoryId: mongoose.Types.ObjectId;
};

function normalize(value: unknown) {
  return String(value || "").trim();
}

async function main() {
  if (process.env.CONFIRM_REPAIR_QUESTION_CATEGORY !== "YES") {
    console.error('Refusing repair. Set CONFIRM_REPAIR_QUESTION_CATEGORY="YES" to proceed.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const questions = db.collection<QuestionDoc>("questions");
  const exams = db.collection<ExamDoc>("exams");

  const candidates = await questions
    .find({
      $or: [
        { examCode: { $type: "string", $ne: "" } },
        { exam: { $type: "string", $ne: "" } },
      ],
    })
    .project({ categoryId: 1, exam: 1, examCode: 1, text: 1 })
    .toArray();

  console.log(`Candidate questions: ${candidates.length}`);

  let updated = 0;
  let alreadyCorrect = 0;
  let unmatched = 0;
  let ambiguous = 0;
  const samples: Array<Record<string, string>> = [];

  for (const question of candidates) {
    const examCode = normalize(question.examCode);
    const examName = normalize(question.exam);
    const currentCategoryId = normalize(question.categoryId);

    let matches: ExamDoc[] = [];

    if (examCode) {
      matches = await exams.find({ code: examCode }).project({ categoryId: 1, name: 1, code: 1 }).toArray();
    }

    if (!matches.length && examName) {
      matches = await exams.find({ name: examName }).project({ categoryId: 1, name: 1, code: 1 }).toArray();
    }

    const uniqueCategoryIds = [...new Set(matches.map((match) => String(match.categoryId)))];

    if (uniqueCategoryIds.length === 0) {
      unmatched++;
      continue;
    }

    if (uniqueCategoryIds.length > 1) {
      ambiguous++;
      if (samples.length < 10) {
        samples.push({
          status: "ambiguous",
          questionId: String(question._id),
          question: normalize(question.text?.en).slice(0, 80),
          exam: examName,
          examCode,
        });
      }
      continue;
    }

    const nextCategoryId = uniqueCategoryIds[0];
    if (currentCategoryId === nextCategoryId) {
      alreadyCorrect++;
      continue;
    }

    await questions.updateOne(
      { _id: question._id },
      { $set: { categoryId: new mongoose.Types.ObjectId(nextCategoryId) } }
    );

    updated++;
    if (samples.length < 10) {
      samples.push({
        status: "updated",
        questionId: String(question._id),
        question: normalize(question.text?.en).slice(0, 80),
        exam: examName,
        examCode,
        fromCategoryId: currentCategoryId,
        toCategoryId: nextCategoryId,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        candidateQuestions: candidates.length,
        updated,
        alreadyCorrect,
        unmatched,
        ambiguous,
        samples,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
  console.log("Disconnected. Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
