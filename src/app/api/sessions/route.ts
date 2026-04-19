import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TestSession from "@/lib/db/models/TestSession";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const body = await request.json();
    const { type, questionIds, context } = body;

    if (!type || !questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "type and questionIds are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    // For daily sessions, check if one already exists
    if (type === "daily" && context?.dailyChallengeDate) {
      const existing = await TestSession.findOne({
        userId: session.user.id,
        type: "daily",
        "context.dailyChallengeDate": context.dailyChallengeDate,
        status: { $ne: "abandoned" },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          data: { sessionId: existing._id, resumed: true, currentIndex: existing.currentIndex },
        });
      }
    }

    const testSession = await TestSession.create({
      userId: session.user.id,
      type,
      context: context || {},
      questionIds,
      totalQuestions: questionIds.length,
      status: "in_progress",
      startedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { sessionId: testSession._id, resumed: false, currentIndex: 0 },
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
