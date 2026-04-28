"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import RankCard from "@/components/gamification/RankCard";
import BadgeGrid from "@/components/gamification/BadgeGrid";
import FreezeShield from "@/components/gamification/FreezeShield";
import type { Rank } from "@/lib/utils/gamification";

const MilestoneCelebration = dynamic(
  () => import("@/components/gamification/MilestoneCelebration"),
  { ssr: false }
);

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  freezesUsedThisWeek: number;
  calendar: Record<string, { completed: boolean; score?: number; frozen?: boolean }>;
}

interface BadgeWithStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "streak" | "learning" | "topic" | "leaderboard" | "special";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  earned: boolean;
  earnedAt: string | null;
}

interface GamificationData {
  rank: {
    current: Rank;
    next: Rank | null;
    progress: number;
    xpToNext: number;
    totalXP: number;
  };
  badges: {
    earned: number;
    total: number;
    byCategory: Record<string, BadgeWithStatus[]>;
  };
}

const MAX_FREEZES = 1; // bumped to 2 for Gold+ dynamically

export default function ProfilePage() {
  const { data: session } = useSession();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [hasDoneToday, setHasDoneToday] = useState(false);
  const [celebration, setCelebration] = useState<{
    type: "toast" | "confetti" | "fullscreen";
    title: string;
    badgeIcon: string;
    bonusXP: number;
  } | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [streakRes, gamRes] = await Promise.all([
        fetch("/api/streaks").then((r) => r.json()),
        fetch("/api/badges").then((r) => r.json()),
      ]);
      if (streakRes.success) {
        setStreakData(streakRes.data);
        // Check if completed today
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        setHasDoneToday(!!streakRes.data.calendar?.[today]?.completed);
      }
      if (gamRes.success) setGamification(gamRes.data);
    }
    fetchAll();
  }, []);

  // Calendar (28 days)
  const calendarDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  });

  const freezesRemaining = streakData
    ? Math.max(0, MAX_FREEZES - (streakData.freezesUsedThisWeek ?? 0))
    : 0;

  return (
    <div className="px-4 pt-6 md:p-10 pb-28 md:pb-10 animate-fade-in space-y-5 max-w-3xl mx-auto">
      {/* Celebration overlay */}
      {celebration && (
        <MilestoneCelebration
          type={celebration.type}
          title={celebration.title}
          badgeIcon={celebration.badgeIcon}
          bonusXP={celebration.bonusXP}
          onDismiss={() => setCelebration(null)}
        />
      )}

      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-3xl text-white font-bold overflow-hidden shadow-lg shadow-primary-600/30">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || ""}
              className="w-full h-full object-cover"
            />
          ) : (
            session?.user?.name?.[0] || "?"
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{session?.user?.name || "User"}</h1>
          <p className="text-sm text-surface-200/50">{session?.user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-300">
              {(session?.user?.targetExam || "ldc").toUpperCase()} Aspirant
            </span>
            {gamification && (
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: `${gamification.rank.current.color}20`,
                  color: gamification.rank.current.color,
                }}
              >
                {gamification.rank.current.icon} {gamification.rank.current.title.en}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rank Card */}
      {gamification && (
        <RankCard
          current={gamification.rank.current}
          next={gamification.rank.next}
          progress={gamification.rank.progress}
          xpToNext={gamification.rank.xpToNext}
          totalXP={gamification.rank.totalXP}
        />
      )}

      {/* Streak Card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-200/60">🔥 Streak Calendar</h3>
          <div className="text-right">
            <p className="text-lg font-bold text-orange-400">
              {streakData?.currentStreak || 0} days
            </p>
            <p className="text-xs text-surface-200/40">
              Best: {streakData?.longestStreak || 0}
            </p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="text-center text-[10px] text-surface-200/30 mb-0.5">{d}</span>
          ))}
          {calendarDays.map((date) => {
            const entry = streakData?.calendar?.[date];
            let dotClass = "empty";
            if (entry?.completed) dotClass = "completed";
            else if (entry?.frozen) dotClass = "frozen";
            return (
              <div key={date} className="flex items-center justify-center py-0.5">
                <div className={`calendar-dot ${dotClass}`} title={date} />
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 pt-3 border-t border-white/5">
          {[
            { cls: "completed", label: "Done" },
            { cls: "frozen", label: "Frozen" },
            { cls: "empty", label: "Missed" },
          ].map(({ cls, label }) => (
            <div key={cls} className="flex items-center gap-1.5">
              <div className={`calendar-dot ${cls}`} />
              <span className="text-[10px] text-surface-200/40">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Freeze Shield */}
      {streakData && (
        <FreezeShield
          currentStreak={streakData.currentStreak}
          freezesRemaining={freezesRemaining}
          hasDoneToday={hasDoneToday}
          onFreeze={() => {
            setStreakData((prev) =>
              prev ? { ...prev, freezesUsedThisWeek: (prev.freezesUsedThisWeek ?? 0) + 1 } : prev
            );
            setCelebration({
              type: "toast",
              title: "Streak protected! 🛡️",
              badgeIcon: "🛡️",
              bonusXP: 0,
            });
          }}
        />
      )}

      {/* Badge Grid */}
      {gamification && (
        <BadgeGrid
          badgesByCategory={gamification.badges.byCategory}
          earnedCount={gamification.badges.earned}
          totalCount={gamification.badges.total}
        />
      )}

      {/* Settings */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-surface-200/60">Settings</h3>
        <SettingRow label="Target Exam" value={(session?.user?.targetExam || "LDC").toUpperCase()} />
        <SettingRow label="Language" value="Malayalam + English" />
        <SettingRow label="Daily Reminder" value="7:00 AM" />
      </div>

      {/* Sign Out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full py-3 rounded-xl border border-error-500/30 text-error-500 text-sm font-semibold hover:bg-error-500/10 transition-all"
      >
        Sign Out
      </button>

      <p className="text-center text-xs text-surface-200/30">
        RankLakshyam v0.1.0 • Made with ❤️ for Kerala PSC Aspirants
      </p>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-light p-3.5 flex items-center justify-between">
      <span className="text-sm text-surface-200">{label}</span>
      <span className="text-sm text-surface-200/50">{value}</span>
    </div>
  );
}
