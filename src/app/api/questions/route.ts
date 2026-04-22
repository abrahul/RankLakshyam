import { NextResponse } from "next/server";
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
    const topic = searchParams.get("topic");
    const subTopic = searchParams.get("subTopic");
    const exam = searchParams.get("exam");
    const difficulty = searchParams.get("difficulty");
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, rawLimit)) : 20;
    const page = Number.isFinite(rawPage) ? Math.max(1, rawPage) : 1;

    await connectDB();

    const filter: Record<string, unknown> = { isVerified: true };
    if (topic && topic.length <= 64) filter.topicId = topic;
    if (subTopic && subTopic.length <= 64) filter.subTopic = subTopic;
    if (exam && exam.length <= 32) filter.examTags = exam; // MongoDB matches if array contains value
    if (difficulty) {
      const d = parseInt(difficulty, 10);
      if (Number.isFinite(d) && d >= 1 && d <= 5) filter.difficulty = d;
    }

    const skip = (page - 1) * limit;
    const [questions, total] = await Promise.all([
      Question.find(filter, { correctOption: 0, explanation: 0 })
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
