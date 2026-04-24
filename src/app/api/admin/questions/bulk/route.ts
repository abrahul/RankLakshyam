import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import { categorizePscQuestion } from "@/lib/examfilter/categorize";

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
        if (!q.text?.en || !q.options || q.options.length !== 4 || !q.correctOption || !q.topicId) {
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

        const categorization = categorizePscQuestion({
          text: q.text?.en,
          optionsText: Array.isArray(q.options) ? q.options.map((o: { en?: string }) => o?.en || "").join(" \n ") : "",
          explanation: q.explanation?.en,
          examCode: q.examCode,
          examName: q.exam || q.pyq?.exam,
          sourceRef: q.sourceRef,
        });

        // Priority: explicit fields > categorization
        const resolvedLevel = q.level || categorization.level;
        const resolvedExam = q.exam || categorization.exam;
        const resolvedExamCode = q.examCode || "";

        await Question.create({
          text: { en: q.text.en, ml: q.text.ml || "" },
          options: q.options.map((o: { key: string; en: string; ml?: string }) => ({
            key: o.key, en: o.en, ml: o.ml || "",
          })),
          correctOption: q.correctOption,
          explanation: { en: q.explanation?.en || "", ml: q.explanation?.ml || "" },
          topicId: q.topicId,
          subTopic: q.subTopic || "",
          tags: q.tags || [],
          difficulty: q.difficulty || 2,
          questionStyle: q.questionStyle || "direct",
          level: resolvedLevel,
          exam: resolvedExam,
          examCode: resolvedExamCode,
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
