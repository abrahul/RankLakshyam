import { after, NextResponse } from "next/server";
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
import { DEFAULT_QUESTION_STYLE, type QuestionStyle } from "@/lib/question-styles";
import { calculateXP, getTodayIST, round } from "@/lib/utils/scoring";
import { checkNewBadges, getStreakMilestone, getRank, getNextRank, getBadgeDef } from "@/lib/utils/gamification";
import mongoose from "mongoose";

type ProgressPayload = {
  current: number;
  total: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  attemptedCount: number;
};

function toIdSet(ids: unknown[] = []) {
  return new Set(ids.map((id) => String(id)));
}

function buildProgress({
  current,
  total,
  correctCount,
  skippedCount,
}: {
  current: number;
  total: number;
  correctCount: number;
  skippedCount: number;
}): ProgressPayload {
  const attemptedCount = Math.max(0, current - skippedCount);
  return {
    current,
    total,
    correctCount,
    wrongCount: Math.max(0, attemptedCount - correctCount),
    skippedCount,
    attemptedCount,
  };
}

async function updateAttemptRollups({
  userId,
  questionId,
  topicId,
  questionStyle,
  isCorrect,
  bookmarkWrong,
}: {
  userId: string;
  questionId: string;
  topicId: string;
  questionStyle: QuestionStyle;
  isCorrect: boolean;
  bookmarkWrong: boolean;
}) {
  const now = new Date();

  let bookmarkPromise = Promise.resolve();
  if (bookmarkWrong) {
    bookmarkPromise = Bookmark.updateOne(
      { userId, questionId },
      { $setOnInsert: { source: "wrong_answer", createdAt: now } },
      { upsert: true }
    ).then(() => {});
  }

  const questionProgressPromise = (async () => {
    const doc = await QuestionProgress.findOneAndUpdate(
      { userId, questionId },
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
    await QuestionProgress.updateOne({ userId, questionId }, { $set: { isMastered } });
  })();

  const topicPerfPromise = (async () => {
    const doc = await TopicPerformance.findOneAndUpdate(
      { userId, topicId },
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
    await TopicPerformance.updateOne({ userId, topicId }, { $set: { accuracy } });
  })();

  const stylePerfPromise = (async () => {
    const doc = await StylePerformance.findOneAndUpdate(
      { userId, questionStyle },
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
    await StylePerformance.updateOne({ userId, questionStyle }, { $set: { accuracy } });
  })();

  await Promise.all([bookmarkPromise, questionProgressPromise, topicPerfPromise, stylePerfPromise]);
}

async function finalizeCompletedSession({
  userId,
  sessionId,
  sessionType,
  correctCount,
  attemptedCount,
  totalTimeSec,
}: {
  userId: string;
  sessionId: string;
  sessionType: string;
  correctCount: number;
  attemptedCount: number;
  totalTimeSec: number;
}) {
  let streak = await Streak.findOne({ userId });
  if (!streak) {
    streak = await Streak.create({ userId, currentStreak: 0, longestStreak: 0 });
  }

  const today = getTodayIST();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  let newStreak = 1;
  if (streak.lastCompletedDate === yesterdayStr) {
    newStreak = streak.currentStreak + 1;
  } else if (streak.lastCompletedDate === today) {
    newStreak = streak.currentStreak;
  }

  const newLongest = Math.max(newStreak, streak.longestStreak);
  const avgTimeSec = attemptedCount ? round(totalTimeSec / attemptedCount) : 0;
  const xpResult = calculateXP({
    correctCount,
    totalQuestions: Math.max(1, attemptedCount),
    avgTimeSec,
    currentStreak: newStreak,
    sessionType,
  });

  await Promise.all([
    Streak.updateOne(
      { userId },
      {
        $set: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastCompletedDate: today,
          [`calendar.${today}`]: { completed: true, score: correctCount },
        },
      }
    ),
    User.updateOne(
      { _id: userId },
      {
        $inc: {
          "stats.totalAttempted": attemptedCount,
          "stats.totalCorrect": correctCount,
          "stats.totalXP": xpResult.totalXP,
        },
        $set: {
          "stats.currentStreak": newStreak,
          "stats.longestStreak": newLongest,
          "stats.lastActiveDate": today,
        },
      }
    ),
    TestSession.updateOne({ _id: sessionId }, { $set: { xpEarned: xpResult.totalXP } }),
  ]);

  const user = await User.findById(userId).lean();
  if (user) {
    const completionHour = parseInt(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false })
    );
    const oldXP = user.stats?.totalXP ?? 0;
    const newBadges = checkNewBadges({
      totalAttempted: (user.stats?.totalAttempted ?? 0) + attemptedCount,
      totalCorrect: (user.stats?.totalCorrect ?? 0) + correctCount,
      currentStreak: newStreak,
      todayScore: sessionType === "daily" ? correctCount : undefined,
      avgTimeSec,
      topicAccuracy: user.stats?.topicAccuracy ?? new Map(),
      completionHour,
      existingBadges: (user.badges || []).map((b: { id: string }) => b.id),
    });

    if (newBadges.length > 0) {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            badges: {
              $each: newBadges.map((id) => ({ id, earnedAt: new Date() })),
            },
          },
        }
      );
    }

    const newRank = getRank(oldXP + xpResult.totalXP);
    const oldRank = getRank(oldXP);
    if (newRank.level > oldRank.level) {
      await User.updateOne({ _id: userId }, { $set: { "stats.rankLevel": newRank.level } });
    }
  }

  try {
    const fullSession = await TestSession.findById(
      sessionId,
      { questionIds: 1, totalQuestions: 1, skippedQuestionIds: 1, startedAt: 1, completedAt: 1, totalTimeSec: 1 }
    ).lean();

    if (!fullSession) return;

    const attempts = await Attempt.find({ sessionId, userId }).lean();
    const attemptByQuestionId = new Map<string, (typeof attempts)[number]>(
      attempts.map((a) => [String(a.questionId), a])
    );
    const fullSkippedIds = new Set((fullSession.skippedQuestionIds || []).map((id) => String(id)));

    const missingIds = fullSession.questionIds.filter((qid) => !attemptByQuestionId.has(String(qid)));
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
          status: "answered" as const,
        };
      }

      const correctOption = correctById.get(String(qid)) || "A";
      const skipped = fullSkippedIds.has(String(qid));
      return {
        questionId: qid,
        selectedOption: null,
        correctOption: correctOption as "A" | "B" | "C" | "D",
        isCorrect: false,
        timeTakenSec: 0,
        status: skipped ? ("skipped" as const) : ("unattempted" as const),
      };
    });

    const snapshotCorrectCount = questions.filter((q) => q.isCorrect).length;
    const snapshotAttemptedCount = questions.filter((q) => q.selectedOption).length;
    const skippedCount = questions.filter((q) => q.status === "skipped").length;
    const unattemptedCount = fullSession.totalQuestions - snapshotAttemptedCount;
    const wrongCount = snapshotAttemptedCount - snapshotCorrectCount;
    const accuracy = snapshotAttemptedCount ? round((snapshotCorrectCount / snapshotAttemptedCount) * 100) : 0;

    await TestAttempt.updateOne(
      { testSessionId: sessionId },
      {
        $setOnInsert: {
          userId,
          testSessionId: sessionId,
          testId: String(sessionId),
          questions,
          totalQuestions: fullSession.totalQuestions,
          correctCount: snapshotCorrectCount,
          wrongCount,
          unattemptedCount,
          skippedCount,
          score: snapshotCorrectCount,
          accuracy,
          startedAt: fullSession.startedAt,
          completedAt: fullSession.completedAt ?? new Date(),
          durationSec: fullSession.totalTimeSec ?? 0,
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("TestAttempt snapshot error:", error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { sessionId, questionId, selectedOption, timeTakenSec } = body;
    const isSkip = body?.action === "skip" || body?.status === "skipped" || selectedOption === null;

    if (!sessionId || !questionId || (!isSkip && !selectedOption) || timeTakenSec === undefined) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "sessionId, questionId, selectedOption/action, and timeTakenSec are required", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (!mongoose.isValidObjectId(sessionId) || !mongoose.isValidObjectId(questionId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Invalid sessionId or questionId", statusCode: 400 } },
        { status: 400 }
      );
    }

    if (!isSkip && !["A", "B", "C", "D"].includes(String(selectedOption))) {
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
    const testSession = await TestSession.findOne({ _id: sessionId, userId: session.user.id })
      .select({
        type: 1,
        questionIds: 1,
        skippedQuestionIds: 1,
        totalQuestions: 1,
        correctCount: 1,
        totalTimeSec: 1,
        currentIndex: 1,
        status: 1,
      })
      .lean();
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

    const questionObjectId = new mongoose.Types.ObjectId(questionId);
    const sessionQuestionIds = new Set(testSession.questionIds.map((id: unknown) => String(id)));
    if (!sessionQuestionIds.has(String(questionObjectId))) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_QUESTION", message: "Question is not part of this session", statusCode: 400 } },
        { status: 400 }
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

    if (isSkip) {
      const skippedIds = toIdSet(testSession.skippedQuestionIds || []);
      const wasSkipped = skippedIds.has(String(questionObjectId));
      skippedIds.add(String(questionObjectId));

      const skippedCount = skippedIds.size;
      const newIndex = testSession.currentIndex + (wasSkipped ? 0 : 1);
      const newTotalTime = testSession.totalTimeSec + (wasSkipped ? 0 : timeTakenSec);
      const isComplete = newIndex >= testSession.totalQuestions;

      const sessionUpdate: Record<string, unknown> = {
        skippedQuestionIds: Array.from(skippedIds).map((id) => new mongoose.Types.ObjectId(id)),
        currentIndex: newIndex,
        totalTimeSec: newTotalTime,
        avgTimeSec: newIndex ? round(newTotalTime / newIndex) : 0,
      };

      await TestSession.updateOne({ _id: sessionId }, { $set: sessionUpdate });

      return NextResponse.json({
        success: true,
        data: {
          skipped: true,
          isCorrect: false,
          correctOption: "",
          explanation: { en: "", ml: "" },
          isComplete,
          progress: buildProgress({
            current: newIndex,
            total: testSession.totalQuestions,
            correctCount: testSession.correctCount,
            skippedCount,
          }),
        },
      });
    }

    // Get correct answer
    const question = await Question.findById(questionId, {
      answer: 1,
      explanation: 1,
      topicId: 1,
      difficulty: 1,
      questionStyle: 1,
    }).lean();
    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: "QUESTION_NOT_FOUND", message: "Question not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const skippedIds = toIdSet(testSession.skippedQuestionIds || []);
    const wasSkipped = skippedIds.delete(String(questionObjectId));
    const skippedCount = skippedIds.size;
    const normalizedSelectedOption = String(selectedOption) as "A" | "B" | "C" | "D";
    const isCorrect = normalizedSelectedOption === question.answer;

    // Write attempt
    const attemptPromise = Attempt.create({
      userId: session.user.id,
      sessionId,
      questionId,
      selectedOption: normalizedSelectedOption,
      correctOption: question.answer,
      isCorrect,
      timeTakenSec,
      topicId: question.topicId,
      difficulty: question.difficulty,
      sessionType: testSession.type,
    });

    // Update session progress
    const newIndex = testSession.currentIndex + (wasSkipped ? 0 : 1);
    const newCorrectCount = testSession.correctCount + (isCorrect ? 1 : 0);
    const newTotalTime = testSession.totalTimeSec + timeTakenSec;
    const isLastQuestion = newIndex >= testSession.totalQuestions && skippedCount === 0;
    const attemptedCount = Math.max(0, newIndex - skippedCount);

    const sessionUpdate: Record<string, unknown> = {
      currentIndex: newIndex,
      correctCount: newCorrectCount,
      totalTimeSec: newTotalTime,
      avgTimeSec: round(newTotalTime / newIndex),
      skippedQuestionIds: Array.from(skippedIds).map((id) => new mongoose.Types.ObjectId(id)),
    };

    if (isLastQuestion) {
      sessionUpdate.status = "completed";
      sessionUpdate.completedAt = new Date();
      sessionUpdate.accuracy = attemptedCount ? round((newCorrectCount / attemptedCount) * 100) : 0;
    }

    const sessionUpdatePromise = TestSession.updateOne({ _id: sessionId }, { $set: sessionUpdate });

    const questionStyle =
      (question as unknown as { questionStyle?: QuestionStyle }).questionStyle || DEFAULT_QUESTION_STYLE;

    await Promise.all([attemptPromise, sessionUpdatePromise]);

    after(async () => {
      try {
        await updateAttemptRollups({
          userId,
          questionId,
          topicId: question.topicId,
          questionStyle,
          isCorrect,
          bookmarkWrong: !isCorrect,
        });

        if (isLastQuestion) {
          await finalizeCompletedSession({
            userId,
            sessionId,
            sessionType: testSession.type,
            correctCount: newCorrectCount,
            attemptedCount,
            totalTimeSec: newTotalTime,
          });
        }
      } catch (error) {
        console.error("Post-answer background updates failed:", error);
      }
    });

    /*
     * Legacy synchronous completion path moved to finalizeCompletedSession().
     *
    // If session completed, XP/streak/badges/history are finalized in the after() callback above.
    let xpResult: ReturnType<typeof calculateXP> | null = null;
    let streakData: { currentStreak: number; longestStreak: number } | null = null;
    let gamificationEvents: Record<string, unknown> | null = null;
    if (false && isLastQuestion) {
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
        totalQuestions: Math.max(1, attemptedCount),
        avgTimeSec: attemptedCount ? round(newTotalTime / attemptedCount) : 0,
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
            "stats.totalAttempted": attemptedCount,
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
          totalAttempted: (user.stats?.totalAttempted ?? 0) + attemptedCount,
          totalCorrect: (user.stats?.totalCorrect ?? 0) + newCorrectCount,
          currentStreak: newStreak,
          todayScore: testSession.type === "daily" ? newCorrectCount : undefined,
          avgTimeSec: attemptedCount ? round(newTotalTime / attemptedCount) : 0,
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
          { questionIds: 1, totalQuestions: 1, skippedQuestionIds: 1, startedAt: 1, completedAt: 1, totalTimeSec: 1 }
        ).lean();

        if (fullSession) {
          const attempts = await Attempt.find({ sessionId, userId: session.user.id }).lean();
          const attemptByQuestionId = new Map<string, (typeof attempts)[number]>(
            attempts.map((a) => [String(a.questionId), a])
          );
          const fullSkippedIds = new Set((fullSession.skippedQuestionIds || []).map((id) => String(id)));

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
                status: "answered" as const,
              };
            }

            const correctOption = correctById.get(String(qid)) || "A";
            const skipped = fullSkippedIds.has(String(qid));
            return {
              questionId: qid,
              selectedOption: null,
              correctOption: correctOption as "A" | "B" | "C" | "D",
              isCorrect: false,
              timeTakenSec: 0,
              status: skipped ? ("skipped" as const) : ("unattempted" as const),
            };
          });

          const correctCount = questions.filter((q) => q.isCorrect).length;
          const attemptedCount = questions.filter((q) => q.selectedOption).length;
          const skippedCount = questions.filter((q) => q.status === "skipped").length;
          const unattemptedCount = fullSession.totalQuestions - attemptedCount;
          const wrongCount = attemptedCount - correctCount;
          const accuracy = attemptedCount ? round((correctCount / attemptedCount) * 100) : 0;

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
                skippedCount,
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

    */
    return NextResponse.json({
      success: true,
      data: {
        isCorrect,
        correctOption: question.answer,
        explanation: question.explanation,
        isComplete: isLastQuestion,
        progress: buildProgress({
          current: newIndex,
          total: testSession.totalQuestions,
          correctCount: newCorrectCount,
          skippedCount,
        }),
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
