import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import TestSession from "@/lib/db/models/TestSession";
import Attempt from "@/lib/db/models/Attempt";
import Question from "@/lib/db/models/Question";
import TestAttempt from "@/lib/db/models/TestAttempt";
import { round } from "@/lib/utils/scoring";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId, forceComplete = false } = body ?? {};
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "sessionId is required", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    const testSession = await TestSession.findOne({ _id: sessionId, userId: session.user.id }).lean();
    if (!testSession) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Session not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const existing = await TestAttempt.findOne({ testSessionId: sessionId }).lean();
    if (existing) {
      return NextResponse.json({ success: true, data: { testAttemptId: existing._id, created: false } });
    }

    if (testSession.status !== "completed" && !forceComplete) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_COMPLETED", message: "Session not completed", statusCode: 409 } },
        { status: 409 }
      );
    }

    const attempts = await Attempt.find({ sessionId, userId: session.user.id }).lean();
    const attemptByQuestionId = new Map<string, (typeof attempts)[number]>(
      attempts.map((a) => [String(a.questionId), a])
    );

    const missingIds = testSession.questionIds.filter((qid) => !attemptByQuestionId.has(String(qid)));
    const missingCorrect = missingIds.length
      ? await Question.find({ _id: { $in: missingIds } }, { correctOption: 1 }).lean()
      : [];
    const correctById = new Map<string, string>(
      missingCorrect.map((q) => [String(q._id), String((q as { correctOption?: string }).correctOption)])
    );

    const questions = testSession.questionIds.map((qid) => {
      const attempt = attemptByQuestionId.get(String(qid));
      if (attempt) {
        return {
          questionId: attempt.questionId,
          selectedOption: attempt.selectedOption,
          correctOption: attempt.correctOption,
          isCorrect: !!attempt.isCorrect,
          timeTakenSec: attempt.timeTakenSec ?? 0,
        };
      }
      const correctOption = correctById.get(String(qid)) || "A";
      return {
        questionId: qid,
        selectedOption: null,
        correctOption: correctOption as "A" | "B" | "C" | "D",
        isCorrect: false,
        timeTakenSec: 0,
      };
    });

    const correctCount = questions.filter((q) => q.isCorrect).length;
    const attemptedCount = questions.filter((q) => q.selectedOption).length;
    const unattemptedCount = testSession.totalQuestions - attemptedCount;
    const wrongCount = attemptedCount - correctCount;
    const accuracy = testSession.totalQuestions ? round((correctCount / testSession.totalQuestions) * 100) : 0;

    if (testSession.status !== "completed" && forceComplete) {
      await TestSession.updateOne(
        { _id: sessionId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            currentIndex: attemptedCount,
            correctCount,
            accuracy,
            totalTimeSec: testSession.totalTimeSec || 0,
            avgTimeSec: attemptedCount ? round((testSession.totalTimeSec || 0) / attemptedCount) : 0,
          },
        }
      );
    }

    const created = await TestAttempt.create({
      userId: session.user.id,
      testSessionId: sessionId,
      testId: String(sessionId),
      questions,
      totalQuestions: testSession.totalQuestions,
      correctCount,
      wrongCount,
      unattemptedCount,
      score: correctCount,
      accuracy,
      startedAt: testSession.startedAt,
      completedAt: testSession.completedAt ?? new Date(),
      durationSec: testSession.totalTimeSec ?? 0,
    });

    return NextResponse.json({ success: true, data: { testAttemptId: created._id, created: true } }, { status: 201 });
  } catch (error) {
    console.error("Test submit error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

