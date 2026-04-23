import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Question from "@/lib/db/models/Question";
import Attempt from "@/lib/db/models/Attempt";
import TestSession from "@/lib/db/models/TestSession";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import { getTodayIST } from "@/lib/utils/scoring";

type StatsResponse = {
  success: true;
  data: {
    overview: {
      totalUsers: number;
      totalQuestions: number;
      verifiedQuestions: number;
      unverifiedQuestions: number;
      totalAttempts: number;
      todayParticipants: number;
      hasDailyChallenge: boolean;
    };
    topicBreakdown: Array<{ _id: string; count: number; verified: number }>;
    recentUsers: Array<{
      _id: string;
      name: string;
      email: string;
      image?: string;
      createdAt: string;
      stats?: { totalXP?: number };
    }>;
  };
};

const CACHE_TTL_MS = 30_000;
let cache: { at: number; value: StatsResponse } | null = null;

// GET admin dashboard stats
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

  // Cache to avoid repeated heavy counts/aggregations on refresh/navigation.
  // Admin stats are informational; 30s staleness is acceptable.
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json(cache.value);
  }

  await connectDB();
  const today = getTodayIST();

  const [
    totalUsers,
    totalQuestions,
    verifiedQuestions,
    totalAttempts,
    todaySessions,
    recentUsers,
    topicCounts,
    dailyChallenge,
  ] = await Promise.all([
    User.countDocuments(),
    Question.countDocuments(),
    Question.countDocuments({ isVerified: true }),
    Attempt.countDocuments(),
    TestSession.countDocuments({ "context.dailyChallengeDate": today, status: "completed" }),
    User.find({}).sort({ createdAt: -1 }).limit(5).select("name email image createdAt stats.totalXP").lean(),
    Question.aggregate([
      { $group: { _id: "$topicId", count: { $sum: 1 }, verified: { $sum: { $cond: ["$isVerified", 1, 0] } } } },
      { $sort: { count: -1 } },
    ]),
    DailyChallenge.findOne({ date: today }).lean(),
  ]);

  const payload: StatsResponse = {
    success: true,
    data: {
      overview: {
        totalUsers,
        totalQuestions,
        verifiedQuestions,
        unverifiedQuestions: totalQuestions - verifiedQuestions,
        totalAttempts,
        todayParticipants: todaySessions,
        hasDailyChallenge: !!dailyChallenge,
      },
      topicBreakdown: topicCounts,
      recentUsers,
    },
  };

  cache = { at: Date.now(), value: payload };
  return NextResponse.json(payload);
}
