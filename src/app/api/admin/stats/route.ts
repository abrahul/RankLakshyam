import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/admin-guard";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Question from "@/lib/db/models/Question";
import Attempt from "@/lib/db/models/Attempt";
import TestSession from "@/lib/db/models/TestSession";
import DailyChallenge from "@/lib/db/models/DailyChallenge";
import { getTodayIST } from "@/lib/utils/scoring";

// GET admin dashboard stats
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.authorized) return guard.response;

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

  return NextResponse.json({
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
  });
}
