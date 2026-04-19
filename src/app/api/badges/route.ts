import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db/connection";
import User from "@/lib/db/models/User";
import { BADGES, getBadgeDef, getRankProgress, checkNewBadges } from "@/lib/utils/gamification";

// GET — fetch user's badges and rank progress
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated", statusCode: 401 } },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found", statusCode: 404 } },
        { status: 404 }
      );
    }

    // Rank data
    const rankData = getRankProgress(user.stats.totalXP);

    // Badge data — earned vs all
    const earnedIds = (user.badges || []).map((b: { id: string }) => b.id);

    const allBadges = BADGES.map((def) => {
      const earned = user.badges?.find((b: { id: string; earnedAt: Date }) => b.id === def.id);
      return {
        ...def,
        earned: !!earned,
        earnedAt: earned?.earnedAt || null,
      };
    });

    // Group by category
    const categories = ["streak", "learning", "topic", "leaderboard", "special"] as const;
    const badgesByCategory = Object.fromEntries(
      categories.map((cat) => [
        cat,
        allBadges.filter((b) => b.category === cat),
      ])
    );

    return NextResponse.json({
      success: true,
      data: {
        rank: {
          current: rankData.current,
          next: rankData.next,
          progress: rankData.progress,
          xpToNext: rankData.xpToNext,
          totalXP: user.stats.totalXP,
        },
        badges: {
          earned: earnedIds.length,
          total: BADGES.length,
          byCategory: badgesByCategory,
        },
      },
    });
  } catch (error) {
    console.error("Badges error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Internal server error", statusCode: 500 } },
      { status: 500 }
    );
  }
}
