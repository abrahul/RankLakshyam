import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import TestSession from "@/lib/db/models/TestSession";
import { getTodayIST } from "@/lib/utils/scoring";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";

    await connectDB();
    const today = getTodayIST();

    let leaderboardData;

    if (period === "daily") {
      // Get today's completed daily sessions, ranked by score
      const dailySessions = await TestSession.aggregate([
        {
          $match: {
            type: "daily",
            "context.dailyChallengeDate": today,
            status: "completed",
          },
        },
        { $sort: { correctCount: -1, avgTimeSec: 1 } },
        { $limit: 100 },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
            pipeline: [{ $project: { name: 1, image: 1, "stats.currentStreak": 1 } }],
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            userId: 1,
            correctCount: 1,
            accuracy: 1,
            avgTimeSec: 1,
            "user.name": 1,
            "user.image": 1,
            "user.stats.currentStreak": 1,
          },
        },
      ]);

      leaderboardData = dailySessions.map((s: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        userId: (s.userId as { toString: () => string }).toString(),
        name: (s.user as { name: string }).name,
        image: (s.user as { image?: string }).image,
        score: s.correctCount as number,
        accuracy: s.accuracy as number,
        avgTime: s.avgTimeSec as number,
        streak: ((s.user as { stats?: { currentStreak?: number } }).stats?.currentStreak) || 0,
      }));
    } else {
      // Weekly/all-time: rank by XP
      const users = await User.find({}, { name: 1, image: 1, "stats.totalXP": 1, "stats.currentStreak": 1 })
        .sort({ "stats.totalXP": -1 })
        .limit(100);

      leaderboardData = users.map((u, i) => ({
        rank: i + 1,
        userId: u._id.toString(),
        name: u.name,
        image: u.image,
        score: u.stats.totalXP,
        streak: u.stats.currentStreak,
      }));
    }

    // Get current user's rank
    const currentUserEntry = leaderboardData.find((e: { userId: string }) => e.userId === session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        period,
        leaderboard: leaderboardData,
        currentUser: currentUserEntry || null,
        totalParticipants: leaderboardData.length,
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
