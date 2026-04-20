import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TopicPerformance from "@/lib/db/models/TopicPerformance";
import StylePerformance from "@/lib/db/models/StylePerformance";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();

    const [topics, styles] = await Promise.all([
      TopicPerformance.find({ userId: session.user.id, attempts: { $gte: 5 } })
        .sort({ accuracy: 1, attempts: -1 })
        .limit(10)
        .lean(),
      StylePerformance.find({ userId: session.user.id, attempts: { $gte: 5 } })
        .sort({ accuracy: 1, attempts: -1 })
        .limit(10)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        weakTopics: topics.map((t) => ({
          topicId: t.topicId,
          attempts: t.attempts,
          correct: t.correct,
          wrong: t.wrong,
          accuracy: t.accuracy,
        })),
        weakStyles: styles.map((s) => ({
          questionStyle: s.questionStyle,
          attempts: s.attempts,
          correct: s.correct,
          wrong: s.wrong,
          accuracy: s.accuracy,
        })),
      },
    });
  } catch (error) {
    console.error("Weak areas error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

