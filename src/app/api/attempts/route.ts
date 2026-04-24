import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Attempt from "@/lib/db/models/Attempt";
import Question from "@/lib/db/models/Question";
import TestSession from "@/lib/db/models/TestSession";
import Bookmark from "@/lib/db/models/Bookmark";
import User from "@/lib/db/models/User";
import Streak from "@/lib/db/models/Streak";
import QuestionProgress from "@/lib/db/models/QuestionProgress";
import TopicPerformance from "@/lib/db/models/TopicPerformance";
import StylePerformance from "@/lib/db/models/StylePerformance";
import TestAttempt from "@/lib/db/models/TestAttempt";
import { calculateXP, getTodayIST, round } from "@/lib/utils/scoring";
import { checkNewBadges, getStreakMilestone, getRank, getNextRank, getBadgeDef } from "@/lib/utils/gamification";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, questionId, selectedOption, timeTakenSec } = body;

    if (!sessionId || !questionId || !selectedOption || timeTakenSec === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "sessionId, questionId, selectedOption, and timeTakenSec are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(sessionId) || !mongoose.isValidObjectId(questionId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid sessionId or questionId", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (!["A", "B", "C", "D"].includes(String(selectedOption))) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "selectedOption must be A, B, C, or D", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (typeof timeTakenSec !== "number" || !Number.isFinite(timeTakenSec) || timeTakenSec < 0 || timeTakenSec > 60 * 60) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "timeTakenSec must be a valid number", statusCode: 400 } },
        { status: 400 }
      );
    }

    await connectDB();

    // Validate session belongs to user
    const testSession = await TestSession.findOne({ _id: sessionId, userId: session.user.id });
    if (!testSession) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SESSION", message: "Session not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    if (testSession.status === "completed") {
      return NextResponse.json(
        { success: false, error: { code: "SESSION_COMPLETED", message: "Session already completed", statusCode: 409 } },
        { status: 409 }
      );
    }

    // Check if already answered this question in this session
    const existingAttempt = await Attempt.findOne({ sessionId, questionId, userId: session.user.id });
    if (existingAttempt) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_ANSWERED", message: "Question already answered", statusCode: 409 } },
        { status: 409 }
      );
    }

    // Get correct answer
    const question = await Question.findById(questionId, { answer: 1, explanation: 1, topicId: 1, difficulty: 1, questionStyle: 1 });
    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: "QUESTION_NOT_FOUND", message: "Question not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const isCorrect = selectedOption === question.answer;

    // Write attempt
    const attemptPromise = Attempt.create({
      userId: session.user.id,
      sessionId,
      questionId,
      selectedOption,
      correctOption: question.answer,
      isCorrect,
      timeTakenSec,
      topicId: question.topicId,
      difficulty: question.difficulty,
      sessionType: testSession.type,
    });

    // Update session progress
    const newIndex = testSession.currentIndex + 1;
    const newCorrectCount = testSession.correctCount + (isCorrect ? 1 : 0);
    const newTotalTime = testSession.totalTimeSec + timeTakenSec;
    const isLastQuestion = newIndex >= testSession.totalQuestions;

    const sessionUpdate: Record<string, unknown> = {
      currentIndex: newIndex,
      correctCount: newCorrectCount,
      totalTimeSec: newTotalTime,
      avgTimeSec: round(newTotalTime / newIndex),
    };

    if (isLastQuestion) {
      sessionUpdate.status = "completed";
      sessionUpdate.completedAt = new Date();
      sessionUpdate.accuracy = round((newCorrectCount / testSession.totalQuestions) * 100);
    }

    const sessionUpdatePromise = TestSession.updateOne({ _id: sessionId }, { $set: sessionUpdate });

    // Auto-bookmark wrong answers
    let bookmarkPromise = Promise.resolve();
    if (!isCorrect) {
      bookmarkPromise = Bookmark.updateOne(
        { userId: session.user.id, questionId },
        { $setOnInsert: { source: "wrong_answer", createdAt: new Date() } },
        { upsert: true }
      ).then(() => {});
    }

    // Update per-user performance collections (best-effort, does not affect scoring)
    const now = new Date();
    const questionStyle =
      (question as unknown as { questionStyle?: "direct" | "concept" | "statement" | "negative" | "indirect" })
        .questionStyle || "direct";

    const questionProgressPromise = (async () => {
      const doc = await QuestionProgress.findOneAndUpdate(
        { userId: session.user.id, questionId },
        {
          $setOnInsert: { isMastered: false },
          $inc: {
            attempts: 1,
            correctAttempts: isCorrect ? 1 : 0,
            wrongAttempts: isCorrect ? 0 : 1,
          },
          $set: { lastAttemptedAt: now },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();

      const attempts = doc?.attempts ?? 0;
      const correctAttempts = doc?.correctAttempts ?? 0;
      const isMastered = attempts >= 5 && correctAttempts / Math.max(1, attempts) >= 0.8;
      await QuestionProgress.updateOne({ userId: session.user.id, questionId }, { $set: { isMastered } });
    })();

    const topicPerfPromise = (async () => {
      const doc = await TopicPerformance.findOneAndUpdate(
        { userId: session.user.id, topicId: question.topicId },
        {
          $setOnInsert: { accuracy: 0 },
          $inc: { attempts: 1, correct: isCorrect ? 1 : 0, wrong: isCorrect ? 0 : 1 },
          $set: { lastAttemptedAt: now },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();

      const attempts = doc?.attempts ?? 0;
      const correct = doc?.correct ?? 0;
      const accuracy = attempts ? round((correct / attempts) * 100) : 0;
      await TopicPerformance.updateOne({ userId: session.user.id, topicId: question.topicId }, { $set: { accuracy } });
    })();

    const stylePerfPromise = (async () => {
      const doc = await StylePerformance.findOneAndUpdate(
        { userId: session.user.id, questionStyle },
        {
          $setOnInsert: { accuracy: 0 },
          $inc: { attempts: 1, correct: isCorrect ? 1 : 0, wrong: isCorrect ? 0 : 1 },
          $set: { lastAttemptedAt: now },
        },
        { upsert: true, returnDocument: "after" }
      ).lean();

      const attempts = doc?.attempts ?? 0;
      const correct = doc?.correct ?? 0;
      const accuracy = attempts ? round((correct / attempts) * 100) : 0;
      await StylePerformance.updateOne({ userId: session.user.id, questionStyle }, { $set: { accuracy } });
    })();

    // Execute writes in parallel
    await Promise.all([
      attemptPromise,
      sessionUpdatePromise,
      bookmarkPromise,
      questionProgressPromise,
      topicPerfPromise,
      stylePerfPromise,
    ]);

    // If session completed, update XP and streak
    let xpResult = null;
    let streakData = null;
    let gamificationEvents: Record<string, unknown> | null = null;
    if (isLastQuestion) {
      // Get or create streak
      let streak = await Streak.findOne({ userId: session.user.id });
      if (!streak) {
        streak = await Streak.create({ userId: session.user.id, currentStreak: 0, longestStreak: 0 });
      }

      const today = getTodayIST();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      let newStreak = 1;
      if (streak.lastCompletedDate === yesterdayStr) {
        newStreak = streak.currentStreak + 1;
      } else if (streak.lastCompletedDate === today) {
        newStreak = streak.currentStreak; // already counted today
      }

      const newLongest = Math.max(newStreak, streak.longestStreak);

      xpResult = calculateXP({
        correctCount: newCorrectCount,
        totalQuestions: testSession.totalQuestions,
        avgTimeSec: round(newTotalTime / testSession.totalQuestions),
        currentStreak: newStreak,
        sessionType: testSession.type,
      });

      // Update streak
      await Streak.updateOne(
        { userId: session.user.id },
        {
          $set: {
            currentStreak: newStreak,
            longestStreak: newLongest,
            lastCompletedDate: today,
            [`calendar.${today}`]: { completed: true, score: newCorrectCount },
          },
        }
      );

      // Update user stats
      await User.updateOne(
        { _id: session.user.id },
        {
          $inc: {
            "stats.totalAttempted": testSession.totalQuestions,
            "stats.totalCorrect": newCorrectCount,
            "stats.totalXP": xpResult.totalXP,
          },
          $set: {
            "stats.currentStreak": newStreak,
            "stats.longestStreak": newLongest,
            "stats.lastActiveDate": today,
          },
        }
      );

      // Update session XP
      await TestSession.updateOne({ _id: sessionId }, { $set: { xpEarned: xpResult.totalXP } });

      streakData = { currentStreak: newStreak, longestStreak: newLongest };

      // ── Badge checking ─────────────────────────────────────
      const user = await User.findById(session.user.id).lean();
      if (user) {
        const completionHour = parseInt(
          new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })
        );

        const newBadges = checkNewBadges({
          totalAttempted: (user.stats?.totalAttempted ?? 0) + testSession.totalQuestions,
          totalCorrect: (user.stats?.totalCorrect ?? 0) + newCorrectCount,
          currentStreak: newStreak,
          todayScore: testSession.type === "daily" ? newCorrectCount : undefined,
          avgTimeSec: round(newTotalTime / testSession.totalQuestions),
          topicAccuracy: user.stats?.topicAccuracy ?? new Map(),
          completionHour,
          existingBadges: (user.badges || []).map((b: { id: string }) => b.id),
        });

        if (newBadges.length > 0) {
          await User.updateOne(
            { _id: session.user.id },
            {
              $push: {
                badges: {
                  $each: newBadges.map((id) => ({ id, earnedAt: new Date() })),
                },
              },
            }
          );
        }

        // Check for streak milestone
        const milestone = getStreakMilestone(newStreak);

        // Check for rank-up
        const oldXP = user.stats?.totalXP ?? 0;
        const newXP = oldXP + xpResult.totalXP;
        const oldRank = getRank(oldXP);
        const newRank = getRank(newXP);
        const rankedUp = newRank.level > oldRank.level;

        // Attach gamification events to response
        gamificationEvents = {
          newBadges: newBadges.map((id) => getBadgeDef(id)).filter(Boolean),
          milestone: milestone
            ? {
                title: milestone.title,
                badgeIcon: milestone.badgeId ? getBadgeDef(milestone.badgeId)?.icon : "🎉",
                bonusXP: milestone.bonusXP,
                celebration: milestone.celebration,
              }
            : null,
          rankUp: rankedUp
            ? { from: oldRank, to: newRank, nextRank: getNextRank(newXP) }
            : null,
        };
      }

      // Snapshot attempt for history/review (best-effort)
      try {
        const fullSession = await TestSession.findById(
          sessionId,
          { questionIds: 1, totalQuestions: 1, startedAt: 1, completedAt: 1, totalTimeSec: 1 }
        ).lean();

        if (fullSession) {
          const attempts = await Attempt.find({ sessionId, userId: session.user.id }).lean();
          const attemptByQuestionId = new Map<string, (typeof attempts)[number]>(
            attempts.map((a) => [String(a.questionId), a])
          );

          const missingIds = fullSession.questionIds.filter(
            (qid) => !attemptByQuestionId.has(String(qid))
          );
          const missingCorrect = missingIds.length
            ? await Question.find({ _id: { $in: missingIds } }, { answer: 1 }).lean()
            : [];
          const correctById = new Map<string, string>(
            missingCorrect.map((q) => [String(q._id), String((q as { answer?: string }).answer)])
          );

          const questions = fullSession.questionIds.map((qid) => {
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
          const unattemptedCount = fullSession.totalQuestions - attemptedCount;
          const wrongCount = attemptedCount - correctCount;
          const accuracy = fullSession.totalQuestions
            ? round((correctCount / fullSession.totalQuestions) * 100)
            : 0;

          await TestAttempt.updateOne(
            { testSessionId: sessionId },
            {
              $setOnInsert: {
                userId: session.user.id,
                testSessionId: sessionId,
                testId: String(sessionId),
                questions,
                totalQuestions: fullSession.totalQuestions,
                correctCount,
                wrongCount,
                unattemptedCount,
                score: correctCount,
                accuracy,
                startedAt: fullSession.startedAt,
                completedAt: fullSession.completedAt ?? new Date(),
                durationSec: fullSession.totalTimeSec ?? 0,
              },
            },
            { upsert: true }
          );
        }
      } catch (e) {
        console.error("TestAttempt snapshot error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        correctOption: question.answer,
        explanation: question.explanation,
        isComplete: isLastQuestion,
        progress: { current: newIndex, total: testSession.totalQuestions, correctCount: newCorrectCount },
        ...(isLastQuestion && { xp: xpResult, streak: streakData, gamification: gamificationEvents }),
      },
    });
  } catch (error) {
    console.error("Submit attempt error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
