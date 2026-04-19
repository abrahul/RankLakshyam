import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Attempt from "@/lib/db/models/Attempt";
import { daysAgoIST, round } from "@/lib/utils/scoring";
import mongoose from "mongoose";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(session.user.id)) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_LINKED", message: "Please sign out and sign in again.", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user stats (denormalized — fast)
    const user = await User.findById(session.user.id, { stats: 1 });
    if (!user) {
      return NextResponse.json({ success: false, error: { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 } }, { status: 404 });
    }

    // 7-day trend
    const weeklyTrend = await Attempt.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(session.user.id),
          createdAt: { $gte: daysAgoIST(7) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } },
          total: { $sum: 1 },
          correct: { $sum: { $cond: ["$isCorrect", 1, 0] } },
          avgTime: { $avg: "$timeTakenSec" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          accuracy: { $round: [{ $multiply: [{ $divide: ["$correct", "$total"] }, 100] }, 1] },
          questionsAttempted: "$total",
          avgTimeSec: { $round: ["$avgTime", 1] },
        },
      },
    ]);

    // Topic breakdown
    const topicAccuracy = user.stats.topicAccuracy || {};
    const weakAreas = Object.entries(topicAccuracy instanceof Map ? Object.fromEntries(topicAccuracy) : topicAccuracy)
      .filter(([, data]) => {
        const d = data as { accuracy: number; attempted: number };
        return d.accuracy < 60 && d.attempted >= 5;
      })
      .sort((a, b) => (a[1] as { accuracy: number }).accuracy - (b[1] as { accuracy: number }).accuracy)
      .map(([topic, data]) => ({ topic, ...(data as { attempted: number; correct: number; accuracy: number }) }));

    const strongAreas = Object.entries(topicAccuracy instanceof Map ? Object.fromEntries(topicAccuracy) : topicAccuracy)
      .filter(([, data]) => {
        const d = data as { accuracy: number; attempted: number };
        return d.accuracy >= 75 && d.attempted >= 5;
      })
      .sort((a, b) => (b[1] as { accuracy: number }).accuracy - (a[1] as { accuracy: number }).accuracy)
      .map(([topic, data]) => ({ topic, ...(data as { attempted: number; correct: number; accuracy: number }) }));

    return NextResponse.json({
      success: true,
      data: {
        overall: {
          totalAttempted: user.stats.totalAttempted,
          totalCorrect: user.stats.totalCorrect,
          accuracy: user.stats.totalAttempted > 0 ? round((user.stats.totalCorrect / user.stats.totalAttempted) * 100) : 0,
          avgTimePerQuestion: user.stats.avgTimePerQuestion,
          totalXP: user.stats.totalXP,
          currentStreak: user.stats.currentStreak,
          longestStreak: user.stats.longestStreak,
        },
        weeklyTrend,
        weakAreas,
        strongAreas,
      },
    });
  } catch (error) {
    console.error("Performance error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
