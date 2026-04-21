import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import Streak from "@/lib/db/models/Streak";
import { getTodayIST } from "@/lib/utils/scoring";
import { getRankProgress } from "@/lib/utils/gamification";
import mongoose from "mongoose";

// Lightweight dashboard payload (avoid heavy aggregates + large badge lists)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }
    if (!mongoose.isValidObjectId(session.user.id)) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_LINKED", message: "Please sign out and sign in again.", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();

    const [user, streak] = await Promise.all([
      User.findById(session.user.id, { stats: 1 }).lean(),
      Streak.findOne({ userId: session.user.id }, { currentStreak: 1, longestStreak: 1, lastCompletedDate: 1 }).lean(),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    const today = getTodayIST();
    const rank = getRankProgress(user.stats.totalXP);

    return NextResponse.json({
      success: true,
      data: {
        hasCompletedToday: (streak?.lastCompletedDate || "") === today,
        streak: {
          currentStreak: streak?.currentStreak || 0,
          longestStreak: streak?.longestStreak || 0,
        },
        overall: {
          totalXP: user.stats.totalXP,
          accuracy: user.stats.accuracy,
          totalAttempted: user.stats.totalAttempted,
        },
        rank: {
          current: rank.current,
          next: rank.next,
          progress: rank.progress,
          xpToNext: rank.xpToNext,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}

