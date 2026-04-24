import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Question from "@/lib/db/models/Question";
import Attempt from "@/lib/db/models/Attempt";
import TestSession from "@/lib/db/models/TestSession";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import Topic from "@/lib/db/models/Topic";
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
    topicMeta: Record<string, { name: string; icon: string; color: string }>;
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
    recentUsersRaw,
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

  const topicIds = (topicCounts as Array<{ _id: string }>).map((topic) => topic._id).filter(Boolean);
  const topicDocs = topicIds.length
    ? await Topic.find({ _id: { $in: topicIds } }).select("_id name icon color").lean()
    : [];
  const topicMeta = Object.fromEntries(
    topicDocs.map((topic) => [
      String(topic._id),
      {
        name: topic.name?.en || String(topic._id),
        icon: topic.icon || "",
        color: topic.color || "#6366f1",
      },
    ])
  );

  const recentUsers = (recentUsersRaw as Array<{
    _id: { toString: () => string };
    name: string;
    email: string;
    image?: string;
    createdAt: Date;
    stats?: { totalXP?: number };
  }>).map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    image: u.image,
    createdAt: u.createdAt.toISOString(),
    stats: { totalXP: u.stats?.totalXP || 0 },
  }));

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
      topicMeta,
      recentUsers,
    },
  };

  cache = { at: Date.now(), value: payload };
  return NextResponse.json(payload);
}
