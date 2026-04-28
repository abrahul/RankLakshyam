import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

function normalizeTopicParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

type PopulatedExamTag = {
  _id?: unknown;
  name?: string;
  code?: string | null;
};

type QuestionPayload = Record<string, unknown> & {
  exam?: string;
  examCode?: string;
  examTags?: Array<string | PopulatedExamTag>;
};

function formatExamTag(tag: string | PopulatedExamTag) {
  if (typeof tag === "string") return "";
  const name = typeof tag.name === "string" ? tag.name.trim() : "";
  const code = typeof tag.code === "string" ? tag.code.trim() : "";
  if (!name) return "";
  return code ? `${name} (${code})` : name;
}

function examAskedIn(question: QuestionPayload) {
  const tagLabels = (Array.isArray(question.examTags) ? question.examTags.map(formatExamTag) : []).filter(Boolean);
  if (tagLabels.length) return Array.from(new Set(tagLabels));

  const exam = typeof question.exam === "string" ? question.exam.trim() : "";
  const code = typeof question.examCode === "string" ? question.examCode.trim() : "";
  if (exam && code) return [`${exam} (${code})`];
  return [exam || code].filter(Boolean);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const topicIdParam = searchParams.get("topicId") || searchParams.get("topic");
    const subtopicId = searchParams.get("subtopicId") || searchParams.get("subTopic");
    const difficulty = searchParams.get("difficulty");
    const language = searchParams.get("language");
    const rawCountParam = searchParams.get("count") || searchParams.get("limit");
    const rawCount = rawCountParam || "20";
    const wantsAll =
      searchParams.get("all") === "1" ||
      searchParams.get("all") === "true" ||
      rawCount.toLowerCase() === "all";
    const rawLimit = parseInt(rawCount, 10);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const maxPageLimit = 500;
    const maxRequestedLimit = 5000;
    const requestedLimit = Number.isFinite(rawLimit) ? rawLimit : 20;
    const limit = wantsAll
      ? Math.max(1, Math.min(maxPageLimit, rawCountParam && Number.isFinite(rawLimit) ? rawLimit : maxPageLimit))
      : Math.max(1, Math.min(maxRequestedLimit, requestedLimit));
    const capped = !wantsAll && requestedLimit > maxRequestedLimit;
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

    await connectDB();

    const filter: Record<string, unknown> = {
      isVerified: true,
      sourceType: { $nin: ["pyq", "pyq_variant"] },
    };
    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_INPUT", message: "Invalid categoryId", statusCode: 400 } },
          { status: 400 }
        );
      }
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
    const topicId = topicIdParam ? normalizeTopicParam(topicIdParam) : null;
    if (topicId && topicId.length <= 64) filter.topicId = topicId;
    if (subtopicId) {
      if (!mongoose.isValidObjectId(subtopicId)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_INPUT", message: "Invalid subtopicId", statusCode: 400 } },
          { status: 400 }
        );
      }
      filter.subtopicId = new mongoose.Types.ObjectId(subtopicId);
    }
    if (difficulty) {
      const d = parseInt(difficulty, 10);
      if (Number.isFinite(d) && d >= 1 && d <= 5) filter.difficulty = d;
    }
    if (language && (language === "en" || language === "ml" || language === "mixed")) {
      filter.language = language;
    }

    const skip = (page - 1) * limit;
    const [rawQuestions, total] = await Promise.all([
      Question.find(filter, { answer: 0, explanation: 0, optionWhy: 0 })
        .populate("examTags", "name code")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Question.countDocuments(filter),
    ]);
    const questions = (rawQuestions as unknown as QuestionPayload[]).map((question) => ({
      ...question,
      examAskedIn: examAskedIn(question),
    }));

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), requestedAll: wantsAll, capped },
    });
  } catch (error) {
    console.error("Questions error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
