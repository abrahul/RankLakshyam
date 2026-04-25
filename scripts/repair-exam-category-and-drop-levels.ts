/**
 * Replaces legacy exams.levelId with categoryId, repairs questions.categoryId from exam metadata,
 * and drops the temporary levels collection.
 *
 * Usage:
 *   $env:CONFIRM_REPAIR_EXAM_CATEGORY="YES"; npx tsx scripts/repair-exam-category-and-drop-levels.ts
 *
 * Requires MONGODB_URI in .env.local
 */

import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

const LEVEL_ID_TO_KEY = {
  "69eb17104b807113840d298c": "10th_level",
  "69eb17104b807113840d298d": "plus2_level",
  "69eb17104b807113840d298e": "degree_level",
  "69eb17114b807113840d298f": "other_exams",
} as const;

type LegacyLevelKey = (typeof LEVEL_ID_TO_KEY)[keyof typeof LEVEL_ID_TO_KEY];

type CategoryDoc = {
  _id: mongoose.Types.ObjectId;
  slug?: string;
  name?: { en?: string; ml?: string };
};

type ExamDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  code?: string | null;
  levelId?: mongoose.Types.ObjectId | string | null;
  categoryId?: mongoose.Types.ObjectId | string | null;
};

type QuestionDoc = {
  _id: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId | string | null;
  exam?: string;
  examCode?: string;
  text?: { en?: string };
};

const LEVEL_ALIASES: Record<LegacyLevelKey, string[]> = {
  "10th_level": ["10th_level", "10th level", "sslc", "10th"],
  "plus2_level": ["plus2_level", "12th_level", "12th level", "plus two", "plus2"],
  "degree_level": ["degree_level", "degree level", "degree"],
  "other_exams": ["other_exams", "other exams", "others", "other"],
};

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveCategoryForLevel(categories: CategoryDoc[], level: LegacyLevelKey) {
  const aliases = LEVEL_ALIASES[level].map(normalize);
  return categories.find((category) =>
    [category.slug, category.name?.en, category.name?.ml]
      .map(normalize)
      .some((value) => aliases.includes(value))
  );
}

function addToIndex(index: Map<string, Set<string>>, key: unknown, categoryId: unknown) {
  const normalizedKey = String(key || "").trim();
  const normalizedCategoryId = String(categoryId || "").trim();
  if (!normalizedKey || !normalizedCategoryId) return;
  const current = index.get(normalizedKey) || new Set<string>();
  current.add(normalizedCategoryId);
  index.set(normalizedKey, current);
}

async function main() {
  if (process.env.CONFIRM_REPAIR_EXAM_CATEGORY !== "YES") {
    console.error('Refusing repair. Set CONFIRM_REPAIR_EXAM_CATEGORY="YES" to proceed.');
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
  const categories = db.collection<CategoryDoc>("categories");
  const exams = db.collection<ExamDoc>("exams");
  const questions = db.collection<QuestionDoc>("questions");
  const levels = db.collection("levels");

  const categoryDocs = await categories.find({}, { projection: { slug: 1, name: 1 } }).toArray();
  const categoryByLevel = new Map<LegacyLevelKey, mongoose.Types.ObjectId>();

  for (const level of Object.values(LEVEL_ID_TO_KEY)) {
    const category = resolveCategoryForLevel(categoryDocs, level);
    if (!category?._id) {
      console.error(`No category found for ${level}. Aborting.`);
      process.exit(1);
    }
    categoryByLevel.set(level, category._id);
  }

  const examIndexes = await exams.indexes();
  if (examIndexes.some((index) => index.name === "name_1_levelId_1")) {
    console.log("Dropping legacy unique index name_1_levelId_1...");
    await exams.dropIndex("name_1_levelId_1");
  }
  if (examIndexes.some((index) => index.name === "levelId_1")) {
    console.log("Dropping legacy index levelId_1...");
    await exams.dropIndex("levelId_1");
  }

  const legacyExams = await exams
    .find({ levelId: { $exists: true } }, { projection: { levelId: 1, categoryId: 1, name: 1, code: 1 } })
    .toArray();

  let examsUpdated = 0;
  let examsUnmapped = 0;
  for (const exam of legacyExams) {
    const levelId = String(exam.levelId || "");
    const levelKey = LEVEL_ID_TO_KEY[levelId as keyof typeof LEVEL_ID_TO_KEY];
    if (!levelKey) {
      examsUnmapped++;
      continue;
    }

    const categoryId = categoryByLevel.get(levelKey);
    if (!categoryId) {
      examsUnmapped++;
      continue;
    }

    await exams.updateOne(
      { _id: exam._id },
      {
        $set: { categoryId },
        $unset: { levelId: "" },
      }
    );
    examsUpdated++;
  }

  const examDocs = await exams.find({}, { projection: { name: 1, code: 1, categoryId: 1 } }).toArray();
  const examCodeToCategories = new Map<string, Set<string>>();
  const examNameToCategories = new Map<string, Set<string>>();

  for (const exam of examDocs) {
    addToIndex(examCodeToCategories, exam.code, exam.categoryId);
    addToIndex(examNameToCategories, exam.name, exam.categoryId);
  }

  await exams.createIndex({ name: 1, categoryId: 1 }, { unique: true, name: "name_1_categoryId_1" });

  const questionCandidates = await questions
    .find(
      {
        $or: [
          { examCode: { $type: "string", $ne: "" } },
          { exam: { $type: "string", $ne: "" } },
        ],
      },
      { projection: { categoryId: 1, exam: 1, examCode: 1, text: 1 } }
    )
    .toArray();

  let questionsUpdated = 0;
  let questionsAlreadyCorrect = 0;
  let questionsUnmatched = 0;
  let questionsAmbiguous = 0;

  for (const question of questionCandidates) {
    const examCode = String(question.examCode || "").trim();
    const examName = String(question.exam || "").trim();
    const currentCategoryId = String(question.categoryId || "").trim();

    const categoryMatches =
      (examCode ? examCodeToCategories.get(examCode) : undefined) ||
      (examName ? examNameToCategories.get(examName) : undefined);

    if (!categoryMatches || categoryMatches.size === 0) {
      questionsUnmatched++;
      continue;
    }

    if (categoryMatches.size > 1) {
      questionsAmbiguous++;
      continue;
    }

    const nextCategoryId = [...categoryMatches][0];
    if (currentCategoryId === nextCategoryId) {
      questionsAlreadyCorrect++;
      continue;
    }

    await questions.updateOne(
      { _id: question._id },
      { $set: { categoryId: new mongoose.Types.ObjectId(nextCategoryId) } }
    );
    questionsUpdated++;
  }

  const levelsExists = (await db.listCollections({ name: "levels" }).toArray()).length > 0;
  if (levelsExists) {
    await levels.drop();
  }

  console.log(
    JSON.stringify(
      {
        examsWithLegacyLevelId: legacyExams.length,
        examsUpdated,
        examsUnmapped,
        questionCandidates: questionCandidates.length,
        questionsUpdated,
        questionsAlreadyCorrect,
        questionsUnmatched,
        questionsAmbiguous,
        levelsDropped: levelsExists,
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
