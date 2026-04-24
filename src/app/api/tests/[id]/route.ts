import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TestAttempt from "@/lib/db/models/TestAttempt";
import Question from "@/lib/db/models/Question";
import mongoose from "mongoose";

type RouteContext<T extends string> = { params: Promise<Record<string, string>> } & { __path?: T };

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/tests/[id]">
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid test attempt id", statusCode: 400 } },
        { status: 400 }
      );
    }
    await connectDB();

    const attempt = await TestAttempt.findOne({ _id: id, userId: session.user.id }).lean();
    if (!attempt) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Test attempt not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find(
      { _id: { $in: questionIds } },
      {
        text: 1,
        options: 1,
        explanation: 1,
        topicId: 1,
        subtopicId: 1,
        difficulty: 1,
        questionStyle: 1,
      }
    ).lean();
    const byId = new Map<string, (typeof questions)[number]>(questions.map((q) => [String(q._id), q]));

    const review = attempt.questions.map((q) => {
      const question = byId.get(String(q.questionId));
      const status = q.selectedOption
        ? q.isCorrect
          ? "correct"
          : "wrong"
        : "unattempted";
      return {
        questionId: q.questionId,
        selectedOption: q.selectedOption,
        correctOption: q.correctOption,
        isCorrect: q.isCorrect,
        timeTakenSec: q.timeTakenSec,
        status,
        question: question
          ? {
              text: question.text,
              options: question.options,
              explanation: question.explanation,
              topicId: question.topicId,
              subTopic: (question as { subtopicId?: unknown }).subtopicId ? String((question as { subtopicId?: unknown }).subtopicId) : "",
              difficulty: question.difficulty,
              questionStyle: (question as { questionStyle?: string }).questionStyle,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          testSessionId: attempt.testSessionId,
          totalQuestions: attempt.totalQuestions,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          unattemptedCount: attempt.unattemptedCount,
          score: attempt.score,
          accuracy: attempt.accuracy,
          durationSec: attempt.durationSec,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
        },
        questions: review,
      },
    });
  } catch (error) {
    console.error("Test review error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
