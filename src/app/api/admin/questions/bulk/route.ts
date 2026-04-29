import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import SubTopic from "@/lib/db/models/SubTopic";
import Topic from "@/lib/db/models/Topic";
import { DEFAULT_QUESTION_STYLE, QUESTION_STYLE_VALUES } from "@/lib/question-styles";

function getPrimaryCategoryId(topic: { categoryId?: unknown; categoryIds?: unknown[] } | null | undefined) {
  const first = topic?.categoryId || topic?.categoryIds?.[0];
  return first ? new mongoose.Types.ObjectId(String(first)) : null;
}

function describeQuestion(index: number, question: { text?: { en?: string } }) {
  const preview = String(question.text?.en || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return preview ? `Q${index + 1} (${preview})` : `Q${index + 1}`;
}

function resolveCategoryIdForQuestion(
  topic: { categoryId?: unknown; categoryIds?: unknown[] } | null | undefined,
  rawCategoryId: unknown
) {
  if (typeof rawCategoryId === "string" && mongoose.isValidObjectId(rawCategoryId)) {
    const allowed = [topic?.categoryId, ...(topic?.categoryIds || [])]
      .filter(Boolean)
      .map((value) => String(value));
    if (allowed.includes(rawCategoryId)) {
      return new mongoose.Types.ObjectId(rawCategoryId);
    }
    return null;
  }

  return getPrimaryCategoryId(topic);
}

async function resolveSubtopicId(rawSubtopic: unknown, topicId: string) {
  if (typeof rawSubtopic !== "string") return undefined;
  const value = rawSubtopic.trim();
  if (!value) return undefined;
  if (mongoose.isValidObjectId(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  const subtopic = await SubTopic.findOne({
    topicId,
    $or: [{ "name.en": value }, { "name.ml": value }],
  })
    .select({ _id: 1 })
    .lean();

  return subtopic?._id ? new mongoose.Types.ObjectId(String(subtopic._id)) : null;
}

// POST bulk import questions
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const { questions, topicId: scopedTopicId, subtopicId: scopedSubtopicId, subTopic: scopedSubTopic } = body;

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
    const scopedTopic = typeof scopedTopicId === "string" && scopedTopicId.trim() ? scopedTopicId.trim() : "";
    const scopedSubtopic = typeof scopedSubtopicId === "string" && scopedSubtopicId.trim()
      ? scopedSubtopicId.trim()
      : typeof scopedSubTopic === "string" && scopedSubTopic.trim()
        ? scopedSubTopic.trim()
        : "";

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const questionLabel = describeQuestion(i, q);
        const effectiveTopicId =
          typeof q.topicId === "string" && q.topicId.trim()
            ? q.topicId.trim()
            : scopedTopic;
        const effectiveSubtopic = q.subtopicId || q.subTopic || scopedSubtopic;
        const resolvedAnswer = q.correctOption || q.answer;
        if (!q.text?.en?.trim()) {
          results.errors.push(`${questionLabel}: Missing text.en`);
          results.skipped++;
          continue;
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          results.errors.push(`${questionLabel}: Exactly 4 options are required`);
          results.skipped++;
          continue;
        }
        if (!resolvedAnswer) {
          results.errors.push(`${questionLabel}: Missing correctOption/answer`);
          results.skipped++;
          continue;
        }
        if (!effectiveTopicId) {
          results.errors.push(`${questionLabel}: Missing topicId and no scoped topic was provided`);
          results.skipped++;
          continue;
        }

        if (q.questionStyle && !QUESTION_STYLE_VALUES.includes(q.questionStyle)) {
          results.errors.push(`${questionLabel}: questionStyle must be one of ${QUESTION_STYLE_VALUES.join(", ")}`);
          results.skipped++;
          continue;
        }

        // Check for duplicate
        const existing = await Question.findOne({ "text.en": q.text.en });
        if (existing) {
          results.errors.push(`${questionLabel}: Duplicate question text already exists`);
          results.skipped++;
          continue;
        }

        const topic = await Topic.findById(effectiveTopicId).select({ categoryId: 1, categoryIds: 1 }).lean();
        if (!topic) {
          results.errors.push(`${questionLabel}: Topic ${effectiveTopicId} was not found`);
          results.skipped++;
          continue;
        }
        const primaryCategoryId = resolveCategoryIdForQuestion(topic, q.categoryId);
        if (!primaryCategoryId) {
          results.errors.push(`${questionLabel}: Invalid categoryId for topic ${effectiveTopicId}`);
          results.skipped++;
          continue;
        }
        const resolvedSubtopicId = await resolveSubtopicId(effectiveSubtopic, effectiveTopicId);
        if (effectiveSubtopic && resolvedSubtopicId === null) {
          results.errors.push(`${questionLabel}: Invalid subtopic for topic ${effectiveTopicId}`);
          results.skipped++;
          continue;
        }
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
          categoryId: primaryCategoryId,
          topicId: effectiveTopicId,
          ...(resolvedSubtopicId ? { subtopicId: resolvedSubtopicId } : {}),
          examTags: resolvedExamTags,
          tags: q.tags || [],
          difficulty: q.difficulty || 2,
          exam: typeof q.exam === "string" ? q.exam.trim() : "",
          examCode: typeof q.examCode === "string" ? q.examCode.trim() : "",
          language: q.language === "ml" || q.language === "mixed" ? q.language : "en",
          questionStyle: q.questionStyle || DEFAULT_QUESTION_STYLE,
          pyq: q.pyq || undefined,
          isVerified: q.isVerified ?? true,
          createdBy: guard.userId,
        });
        results.created++;
      } catch (err) {
        const questionLabel = describeQuestion(i, q);
        results.errors.push(`${questionLabel}: ${err instanceof Error ? err.message : "Unknown error"}`);
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
