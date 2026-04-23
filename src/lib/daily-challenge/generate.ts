import Question from "@/lib/db/models/Question";
import mongoose from "mongoose";

// Content strategy: topic weights & difficulty curve
const TOPIC_WEIGHTS: Record<string, number> = {
  history: 4,
  geography: 3,
  polity: 3,
  science: 3,
  current_affairs: 2,
  language: 2,
  reasoning: 2,
  gk: 1,
};
const TOTAL_WEIGHT = Object.values(TOPIC_WEIGHTS).reduce((a, b) => a + b, 0);

// Difficulty curve: Q1-5 easy (1-2), Q6-12 medium (2-3), Q13-18 hard (3-4), Q19-20 boss (4-5)
const DIFFICULTY_SLOTS: Array<[number, number]> = [
  ...(Array(5).fill([1, 2]) as Array<[number, number]>),
  ...(Array(7).fill([2, 3]) as Array<[number, number]>),
  ...(Array(6).fill([3, 4]) as Array<[number, number]>),
  ...(Array(2).fill([4, 5]) as Array<[number, number]>),
];

export async function buildWeightedDailyChallengeQuestionIds(excludeIds: string[] = []): Promise<string[]> {
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
  topicTargets.history += diff;

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

  function takeFromTopic(topic: string, minD: number, maxD: number): void {
    const pool = poolByTopic.get(topic) || [];

    for (const q of pool) {
      const id = q._id.toString();
      if (used.has(id)) continue;
      if (q.difficulty >= minD && q.difficulty <= maxD) {
        used.add(id);
        selectedIds.push(id);
        return;
      }
    }

    for (const q of pool) {
      const id = q._id.toString();
      if (used.has(id)) continue;
      used.add(id);
      selectedIds.push(id);
      return;
    }
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

