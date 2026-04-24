import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";
import Topic from "@/lib/db/models/Topic";

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const [questions, total] = await Promise.all([
    Question.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return NextResponse.json({
    success: true,
    data: questions,
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
      subtopicId,
      examTags,
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

    await connectDB();

    // Derive category from topic (source of truth)
    const topic = await Topic.findById(String(topicId)).select({ categoryId: 1 }).lean();
    if (!topic?.categoryId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid topicId (no category linked)", statusCode: 400 } },
        { status: 400 }
      );
    }
    const resolvedSubtopicId =
      subtopicId && mongoose.isValidObjectId(subtopicId) ? new mongoose.Types.ObjectId(subtopicId) : undefined;
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
      categoryId: topic.categoryId,
      topicId,
      subtopicId: resolvedSubtopicId,
      examTags: resolvedExamTags,
      tags: tags || [],
      difficulty: difficulty || 2,
      language: language === "ml" || language === "mixed" ? language : "en",
      questionStyle: questionStyle || "direct",
      pyq: pyq || undefined,
      isVerified: true, // Admin-created = auto-verified
      createdBy: guard.userId,
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to create question", statusCode: 500 } },
      { status: 500 }
    );
  }
}
