import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TestAttempt from "@/lib/db/models/TestAttempt";
import TestSession from "@/lib/db/models/TestSession";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));

    await connectDB();

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      TestAttempt.find({ userId: session.user.id })
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TestAttempt.countDocuments({ userId: session.user.id }),
    ]);

    const sessionIds = items.map((i) => i.testSessionId);
    const sessions = sessionIds.length
      ? await TestSession.find({ _id: { $in: sessionIds } }, { type: 1, context: 1 }).lean()
      : [];
    const byId = new Map<string, (typeof sessions)[number]>(sessions.map((s) => [String(s._id), s]));

    const data = items.map((t) => {
      const sess = byId.get(String(t.testSessionId));
      return {
        _id: t._id,
        testSessionId: t.testSessionId,
        type: sess?.type ?? "custom",
        context: sess?.context ?? {},
        totalQuestions: t.totalQuestions,
        correctCount: t.correctCount,
        wrongCount: t.wrongCount,
        unattemptedCount: t.unattemptedCount,
        skippedCount: t.skippedCount ?? t.unattemptedCount,
        score: t.score,
        accuracy: t.accuracy,
        durationSec: t.durationSec,
        startedAt: t.startedAt,
        completedAt: t.completedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Test history error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
