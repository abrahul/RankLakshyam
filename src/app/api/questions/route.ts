import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Question from "@/lib/db/models/Question";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const topicId = searchParams.get("topicId") || searchParams.get("topic");
    const subtopicId = searchParams.get("subtopicId") || searchParams.get("subTopic");
    const examId = searchParams.get("examId");
    const difficulty = searchParams.get("difficulty");
    const language = searchParams.get("language");
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

    await connectDB();

    const filter: Record<string, unknown> = { isVerified: true };
    if (categoryId) {
      if (!mongoose.isValidObjectId(categoryId)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_INPUT", message: "Invalid categoryId", statusCode: 400 } },
          { status: 400 }
        );
      }
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }
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
    if (examId) {
      if (!mongoose.isValidObjectId(examId)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_INPUT", message: "Invalid examId", statusCode: 400 } },
          { status: 400 }
        );
      }
      filter.examTags = new mongoose.Types.ObjectId(examId);
    }
    if (difficulty) {
      const d = parseInt(difficulty, 10);
      if (Number.isFinite(d) && d >= 1 && d <= 5) filter.difficulty = d;
    }
    if (language && (language === "en" || language === "ml" || language === "mixed")) {
      filter.language = language;
    }

    const skip = (page - 1) * limit;
    const [questions, total] = await Promise.all([
      Question.find(filter, { answer: 0, explanation: 0, optionWhy: 0 })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Question.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: questions,
      meta: { page, limit, total },
    });
  } catch (error) {
    console.error("Questions error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
