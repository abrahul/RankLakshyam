import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import Streak from "@/lib/db/models/Streak";
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
    const streak = await Streak.findOne({ userId: session.user.id });

    if (!streak) {
      return NextResponse.json({
        success: true,
        data: { currentStreak: 0, longestStreak: 0, calendar: {}, lastCompletedDate: null },
      });
    }

    // Convert calendar Map to plain object
    const calendarObj: Record<string, { completed: boolean; score?: number; frozen?: boolean }> = {};
    if (streak.calendar) {
      streak.calendar.forEach((value, key) => {
        calendarObj[key] = value;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastCompletedDate: streak.lastCompletedDate,
        freezesUsedThisWeek: streak.freezesUsedThisWeek,
        calendar: calendarObj,
      },
    });
  } catch (error) {
    console.error("Streak error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
