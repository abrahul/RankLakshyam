import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import Topic from "@/lib/db/models/Topic";

// POST bulk import questions
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "questions array is required", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (questions.length > 100) {
      return NextResponse.json(
        { success: false, error: { code: "LIMIT_EXCEEDED", message: "Maximum 100 questions per batch", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const resolvedAnswer = q.correctOption || q.answer;
        if (!q.text?.en || !q.options || q.options.length !== 4 || !resolvedAnswer || !q.topicId) {
          results.errors.push(`Q${i + 1}: Missing required fields`);
          results.skipped++;
          continue;
        }

        // Check for duplicate
        const existing = await Question.findOne({ "text.en": q.text.en });
        if (existing) {
          results.skipped++;
          continue;
        }

        const topic = await Topic.findById(String(q.topicId)).select({ categoryId: 1 }).lean();
        if (!topic?.categoryId) {
          results.errors.push(`Q${i + 1}: Invalid topicId (no category linked)`);
          results.skipped++;
          continue;
        }
        const resolvedSubtopicId =
          q.subtopicId && mongoose.isValidObjectId(q.subtopicId)
            ? new mongoose.Types.ObjectId(q.subtopicId)
            : undefined;
        const resolvedExamTags = Array.isArray(q.examTags)
          ? q.examTags
              .filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id))
              .map((id: string) => new mongoose.Types.ObjectId(id))
          : [];

        await Question.create({
          text: { en: q.text.en, ml: q.text.ml || "" },
          options: q.options.map((o: { key: string; en: string; ml?: string }) => ({
            key: o.key, en: o.en, ml: o.ml || "",
          })),
          answer: resolvedAnswer,
          explanation: { en: q.explanation?.en || "", ml: q.explanation?.ml || "" },
          categoryId: topic.categoryId,
          topicId: q.topicId,
          subtopicId: resolvedSubtopicId,
          examTags: resolvedExamTags,
          tags: q.tags || [],
          difficulty: q.difficulty || 2,
          language: q.language === "ml" || q.language === "mixed" ? q.language : "en",
          questionStyle: q.questionStyle || "direct",
          pyq: q.pyq || undefined,
          isVerified: q.isVerified ?? true,
          createdBy: guard.userId,
        });
        results.created++;
      } catch (err) {
        results.errors.push(`Q${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to import questions", statusCode: 500 } },
      { status: 500 }
    );
  }
}
