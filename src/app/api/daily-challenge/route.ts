import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import Question from "@/lib/db/models/Question";
import TestSession from "@/lib/db/models/TestSession";
import { getTodayIST } from "@/lib/utils/scoring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    await connectDB();
    const today = getTodayIST();

    // Check if user already has an active or completed session for today
    const existingSession = await TestSession.findOne({
      userId: session.user.id,
      type: "daily",
      "context.dailyChallengeDate": today,
    });

    // Get today's challenge
    let challenge = await DailyChallenge.findOne({ date: today });

    // If no challenge exists for today, generate one on-the-fly (fallback)
    if (!challenge) {
      const questions = await Question.aggregate([
        { $match: { isVerified: true } },
        { $sample: { size: 20 } },
        { $project: { _id: 1 } },
      ]);

      if (questions.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: "NO_QUESTIONS", message: "No questions available. Please seed the database.", statusCode: 404 } },
          { status: 404 }
        );
      }

      challenge = await DailyChallenge.create({
        date: today,
        questionIds: questions.map((q: { _id: string }) => q._id),
        topicMix: {},
        difficultyLevel: "medium",
      });
    }

    // Fetch full question data (without correct answer if session in progress)
    const questions = await Question.find(
      { _id: { $in: challenge.questionIds } },
      {
        text: 1,
        options: 1,
        topicId: 1,
        difficulty: 1,
        // Only include answer/explanation if user completed
        ...(existingSession?.status === "completed"
          ? { correctOption: 1, explanation: 1 }
          : {}),
      }
    );

    // Maintain question order from challenge
    const orderedQuestions = challenge.questionIds.map((id: { toString: () => string }) =>
      questions.find((q) => q._id.toString() === id.toString())
    ).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        date: today,
        questions: orderedQuestions,
        totalQuestions: orderedQuestions.length,
        existingSession: existingSession
          ? {
              id: existingSession._id,
              status: existingSession.status,
              currentIndex: existingSession.currentIndex,
              correctCount: existingSession.correctCount,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Daily challenge error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
