import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

// GET all questions (admin view with answers)
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
  const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(200, Math.max(1, rawLimit)) : 20;
  const categoryId = searchParams.get("categoryId");
  const topicId = searchParams.get("topicId") || searchParams.get("topic");
  const subtopicId = searchParams.get("subtopicId") || searchParams.get("subTopic");
  const examId = searchParams.get("examId");
  const verified = searchParams.get("verified");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort");

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (categoryId) {
    if (mongoose.isValidObjectId(categoryId)) filter.categoryId = new mongoose.Types.ObjectId(categoryId);
  }
  if (topicId) filter.topicId = topicId;
  if (subtopicId && mongoose.isValidObjectId(subtopicId)) {
    filter.subtopicId = new mongoose.Types.ObjectId(subtopicId);
  }
  if (examId && mongoose.isValidObjectId(examId)) {
    filter.examTags = new mongoose.Types.ObjectId(examId);
  }
  if (verified === "true") filter.isVerified = true;
  if (verified === "false") filter.isVerified = false;
  if (search) {
    const s = escapeRegex(search.slice(0, 64));
    filter.$or = [
      { "text.en": { $regex: s, $options: "i" } },
      { "text.ml": { $regex: s, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sortOrder = sort === "createdAt_asc" ? { createdAt: 1 as const } : { createdAt: -1 as const };
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  const normalizedQuestions = questions.map((question) => ({
    ...question,
    categoryId: question.categoryId ? String(question.categoryId) : "",
    correctOption: String(question.answer || ""),
    subTopic: question.subtopicId ? String(question.subtopicId) : "",
    subtopicId: question.subtopicId ? String(question.subtopicId) : "",
  }));

  return NextResponse.json({
    success: true,
    data: normalizedQuestions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST create a new question
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  try {
    const body = await request.json();
    const {
      text,
      options,
      correctOption,
      answer,
      explanation,
      topicId,
      categoryId,
      subtopicId,
      subTopic,
      examTags,
      exam,
      examCode,
      tags,
      difficulty,
      language,
      pyq,
      questionStyle,
    } = body;

    // Validation
    const resolvedAnswer = (correctOption || answer) as string | undefined;
    if (!text?.en || !options || options.length !== 4 || !resolvedAnswer || !topicId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "text.en, 4 options, answer, and topicId are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    const validKeys = ["A", "B", "C", "D"];
    if (!validKeys.includes(resolvedAnswer)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "answer must be A, B, C, or D", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (questionStyle && !QUESTION_STYLE_VALUES.includes(questionStyle)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: `questionStyle must be one of: ${QUESTION_STYLE_VALUES.join(", ")}`,
            statusCode: 400,
          },
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Derive category from topic (source of truth)
    const topic = await Topic.findById(String(topicId)).select({ categoryId: 1, categoryIds: 1 }).lean();
    const primaryCategoryId = resolveCategoryIdForQuestion(topic, categoryId);
    if (!primaryCategoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid categoryId for the selected topic", statusCode: 400 } },
        { status: 400 }
      );
    }
    const resolvedSubtopicId = await resolveSubtopicId(subtopicId || subTopic, String(topicId));
    if ((subtopicId || subTopic) && resolvedSubtopicId === null) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid subtopic for the selected topic", statusCode: 400 },
        },
        { status: 400 }
      );
    }
    const resolvedExamTags = Array.isArray(examTags)
      ? examTags
          .filter((id: unknown) => typeof id === "string" && mongoose.isValidObjectId(id))
          .map((id: string) => new mongoose.Types.ObjectId(id))
      : [];

    const question = await Question.create({
      text: { en: text.en, ml: text.ml || "" },
      options: options.map((o: { key: string; en: string; ml?: string }) => ({
        key: o.key,
        en: o.en,
        ml: o.ml || "",
      })),
      answer: resolvedAnswer,
      explanation: { en: explanation?.en || "", ml: explanation?.ml || "" },
      categoryId: primaryCategoryId,
      topicId,
      ...(resolvedSubtopicId ? { subtopicId: resolvedSubtopicId } : {}),
      examTags: resolvedExamTags,
      tags: tags || [],
      difficulty: difficulty || 2,
      exam: typeof exam === "string" ? exam.trim() : "",
      examCode: typeof examCode === "string" ? examCode.trim() : "",
      language: language === "ml" || language === "mixed" ? language : "en",
      questionStyle: questionStyle || DEFAULT_QUESTION_STYLE,
      pyq: pyq || undefined,
      isVerified: true, // Admin-created = auto-verified
      createdBy: guard.userId,
    });

    revalidatePath("/api/admin/questions");

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create question", statusCode: 500 } },
      { status: 500 }
    );
  }
}
