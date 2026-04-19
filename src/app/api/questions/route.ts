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
    const difficulty = searchParams.get("difficulty");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    await connectDB();

    const filter: Record<string, unknown> = { isVerified: true };
    if (topic) filter.topicId = topic;
    if (difficulty) filter.difficulty = parseInt(difficulty, 10);

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
