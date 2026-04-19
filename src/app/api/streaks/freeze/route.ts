import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Streak from "@/lib/db/models/Streak";
import User from "@/lib/db/models/User";
import { getTodayIST, getYesterdayIST } from "@/lib/utils/scoring";

// POST — use a streak freeze for today
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();
    const today = getTodayIST();
    const yesterday = getYesterdayIST();

    const streak = await Streak.findOne({ userId: session.user.id });
    if (!streak) {
      return NextResponse.json(
        { success: false, error: { code: "NO_STREAK", message: "No streak data found", statusCode: 404 } },
        { status: 404 }
      );
    }

    // Check if already completed today
    const todayEntry = streak.calendar.get(today);
    if (todayEntry?.completed) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_COMPLETED", message: "You already completed today's challenge", statusCode: 400 } },
        { status: 400 }
      );
    }

    // Check if already frozen today
    if (todayEntry?.frozen) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_FROZEN", message: "Freeze already used today", statusCode: 400 } },
        { status: 400 }
      );
    }

    // Check if streak is actually at risk (missed yesterday)
    if (streak.lastCompletedDate === today || streak.lastCompletedDate === yesterday) {
      // Streak is fine, no need for freeze
      // But allow if it's a "pre-emptive" freeze for today
    }

    // Check freeze availability (1 per week, Gold rank gets 2)
    const user = await User.findById(session.user.id).select("stats.totalXP").lean();
    const maxFreezes = (user?.stats?.totalXP ?? 0) >= 12000 ? 2 : 1; // Gold rank = 12000 XP

    // Reset freeze count if it's a new week (Monday)
    const now = new Date();
    const dayOfWeek = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).getDay();
    const lastFreezeDate = streak.lastFreezeDate;

    if (lastFreezeDate) {
      const lastFreezeDay = new Date(lastFreezeDate);
      const diffDays = Math.floor((now.getTime() - lastFreezeDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 7 || (dayOfWeek === 1 && streak.freezesUsedThisWeek > 0)) {
        streak.freezesUsedThisWeek = 0;
      }
    }

    if (streak.freezesUsedThisWeek >= maxFreezes) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FREEZES", message: `No freezes left this week (${maxFreezes} max)`, statusCode: 400 } },
        { status: 400 }
      );
    }

    // Apply freeze
    streak.calendar.set(today, { completed: false, frozen: true });
    streak.freezesUsedThisWeek += 1;
    streak.lastFreezeDate = today;
    // Don't break the streak — keep currentStreak as-is
    await streak.save();

    return NextResponse.json({
      success: true,
      data: {
        message: "Streak freeze activated! Your streak is safe 🛡️",
        currentStreak: streak.currentStreak,
        freezesRemaining: maxFreezes - streak.freezesUsedThisWeek,
      },
    });
  } catch (error) {
    console.error("Streak freeze error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
