import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import Question from "@/lib/db/models/Question";
import TestSession from "@/lib/db/models/TestSession";
import { getTodayIST } from "@/lib/utils/scoring";
import mongoose from "mongoose";
import { buildWeightedDailyChallengeQuestionIds } from "@/lib/daily-challenge/generate";

// ─── Content Strategy: Topic weights & difficulty curve ───────────────────────
const TOPIC_WEIGHTS: Record<string, number> = {
  history: 4,        // 20% — highest weight (Kerala History + Renaissance)
  geography: 3,      // 15%
  polity: 3,         // 15%
  science: 3,        // 15%
  current_affairs: 2, // 10%
  language: 2,       // 10%
  reasoning: 2,      // 10%
  gk: 1,             // 5%
};
const TOTAL_WEIGHT = Object.values(TOPIC_WEIGHTS).reduce((a, b) => a + b, 0);

// Difficulty curve: Q1-5 easy (1-2), Q6-12 medium (2-3), Q13-18 hard (3-4), Q19-20 boss (4-5)
const DIFFICULTY_SLOTS: Array<[number, number]> = [
  ...(Array(5).fill([1, 2]) as Array<[number, number]>),
  ...(Array(7).fill([2, 3]) as Array<[number, number]>),
  ...(Array(6).fill([3, 4]) as Array<[number, number]>),
  ...(Array(2).fill([4, 5]) as Array<[number, number]>),
];

async function buildWeightedChallenge(excludeIds: string[] = []): Promise<string[]> {
  // Allocate questions per topic (20 total)
  const topicTargets: Record<string, number> = {};
  let allocated = 0;
  for (const [topic, weight] of Object.entries(TOPIC_WEIGHTS)) {
    const count = Math.round((weight / TOTAL_WEIGHT) * 20);
    topicTargets[topic] = count;
    allocated += count;
  }
  // Fix rounding to exactly 20
  const diff = 20 - allocated;
  topicTargets["history"] += diff;

  // Create a 20-slot topic plan (topic order matches original loop behavior)
  const topicPlan: string[] = [];
  for (const [topic, count] of Object.entries(topicTargets)) {
    for (let i = 0; i < count; i++) topicPlan.push(topic);
  }

  const used = new Set<string>(excludeIds);

  // Fetch a random pool per topic in parallel to avoid 20 sequential DB calls.
  const perTopicPools = await Promise.all(
    Object.keys(topicTargets).map(async (topic) => {
      const target = topicTargets[topic] || 0;
      if (target <= 0) return { topic, pool: [] as Array<{ _id: mongoose.Types.ObjectId; difficulty: number }> };

      const sampleSize = Math.min(400, Math.max(80, target * 40));
      const pool = await Question.aggregate<{ _id: mongoose.Types.ObjectId; difficulty: number }>([
        { $match: { topicId: topic, isVerified: true } },
        { $sample: { size: sampleSize } },
        { $project: { _id: 1, difficulty: 1 } },
      ]);

      return { topic, pool };
    })
  );

  const poolByTopic = new Map<string, Array<{ _id: mongoose.Types.ObjectId; difficulty: number }>>(
    perTopicPools.map((x) => [x.topic, x.pool])
  );

  const selectedIds: string[] = [];

  function takeFromTopic(topic: string, minD: number, maxD: number): string | null {
    const pool = poolByTopic.get(topic) || [];

    for (const q of pool) {
      const id = q._id.toString();
      if (used.has(id)) continue;
      if (q.difficulty >= minD && q.difficulty <= maxD) {
        used.add(id);
        selectedIds.push(id);
        return id;
      }
    }

    for (const q of pool) {
      const id = q._id.toString();
      if (used.has(id)) continue;
      used.add(id);
      selectedIds.push(id);
      return id;
    }

    return null;
  }

  // Fill planned 20 slots
  for (let i = 0; i < 20; i++) {
    const topic = topicPlan[i] || "history";
    const [minD, maxD] = DIFFICULTY_SLOTS[Math.min(i, DIFFICULTY_SLOTS.length - 1)];
    takeFromTopic(topic, minD, maxD);
  }

  // Final fallback: top up from any verified questions
  const missing = 20 - selectedIds.length;
  if (missing > 0) {
    const fallback = await Question.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { isVerified: true } },
      { $sample: { size: Math.min(400, missing * 20) } },
      { $project: { _id: 1 } },
    ]);
    for (const q of fallback) {
      if (selectedIds.length >= 20) break;
      const id = q._id.toString();
      if (used.has(id)) continue;
      used.add(id);
      selectedIds.push(id);
    }
  }

  return selectedIds;
}


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

    // If no challenge exists for today, generate one using weighted topic + difficulty curve
    if (!challenge) {
      const questionIds = await buildWeightedDailyChallengeQuestionIds();

      if (questionIds.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: "NO_QUESTIONS", message: "No questions available. Please seed the database.", statusCode: 404 } },
          { status: 404 }
        );
      }

      // Build topic mix summary for analytics
      const topicMix: Record<string, number> = {};
      for (const q of await Question.find({ _id: { $in: questionIds } }, { topicId: 1 }).lean()) {
        topicMix[q.topicId] = (topicMix[q.topicId] || 0) + 1;
      }

      challenge = await DailyChallenge.create({
        date: today,
        questionIds,
        topicMix,
        difficultyLevel: "mixed",
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
