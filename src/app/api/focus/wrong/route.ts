import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import QuestionProgress from "@/lib/db/models/QuestionProgress";
import Question from "@/lib/db/models/Question";
import TestSession from "@/lib/db/models/TestSession";
import mongoose from "mongoose";

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

    const wrong = await QuestionProgress.find({ userId: session.user.id, wrongAttempts: { $gte: 1 } })
      .sort({ lastAttemptedAt: -1 })
      .limit(20)
      .lean();

    let questionIds: mongoose.Types.ObjectId[] = wrong.map((d) => d.questionId as mongoose.Types.ObjectId);

    if (questionIds.length < 20) {
      const filler = await Question.aggregate([
        { $match: { isVerified: true, _id: { $nin: questionIds } } },
        { $sample: { size: 20 - questionIds.length } },
        { $project: { _id: 1 } },
      ]);
      questionIds = [
        ...questionIds,
        ...filler.map((f: { _id: mongoose.Types.ObjectId }) => f._id),
      ];
    }

    if (questionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_QUESTIONS", message: "No questions available", statusCode: 404 } },
        { status: 404 }
      );
    }

    const testSession = await TestSession.create({
      userId: session.user.id,
      type: "weak_area",
      context: { mode: "wrong" },
      questionIds,
      totalQuestions: questionIds.length,
      status: "in_progress",
      startedAt: new Date(),
    });

    const questions = await Question.find(
      { _id: { $in: questionIds } },
      { text: 1, options: 1, topicId: 1, difficulty: 1 }
    ).lean();
    const byId = new Map<string, (typeof questions)[number]>(questions.map((q) => [String(q._id), q]));

    const ordered = questionIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      data: { sessionId: testSession._id, questions: ordered, totalQuestions: ordered.length },
    });
  } catch (error) {
    console.error("Focus wrong error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
