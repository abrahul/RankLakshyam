"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Rank } from "@/lib/utils/gamification";

interface DashboardData {
  hasCompletedToday: boolean;
  streak: number;
  xp: number;
  accuracy: number;
  totalAttempted: number;
  rankInfo?: { current: Rank; next: Rank | null; progress: number; xpToNext: number };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [perfRes, streakRes, badgeRes] = await Promise.all([
          fetch("/api/performance"),
          fetch("/api/streaks"),
          fetch("/api/badges"),
        ]);

        const perf = await perfRes.json();
        const streak = await streakRes.json();
        const badges = await badgeRes.json();

        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const todayEntry = streak.data?.calendar?.[today];

        setDashData({
          hasCompletedToday: !!todayEntry?.completed,
          streak: streak.data?.currentStreak || 0,
          xp: perf.data?.overall?.totalXP || 0,
          accuracy: perf.data?.overall?.accuracy || 0,
          totalAttempted: perf.data?.overall?.totalAttempted || 0,
          rankInfo: badges.data?.rank || undefined,
        });
      } catch {
        setDashData({
          hasCompletedToday: false,
          streak: 0,
          xp: 0,
          accuracy: 0,
          totalAttempted: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="px-4 pt-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-surface-200/60 text-sm">{greeting}</p>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
            {session?.user?.name?.split(" ")[0] || "Aspirant"} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {dashData?.rankInfo && (
            <Link href="/profile" className="glass-card-light px-3 py-1.5 flex items-center gap-1.5">
              <span className="text-sm">{dashData.rankInfo.current.icon}</span>
              <span className="text-xs font-bold" style={{ color: dashData.rankInfo.current.color }}>
                {dashData.rankInfo.current.title.en}
              </span>
            </Link>
          )}
          {session?.user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="glass-card-light px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-surface-200/70 hover:text-surface-200 transition-all"
              aria-label="Sign out"
            >
              <span className="text-sm">⎋</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          ) : null}
          <div className="glass-card-light px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-lg animate-streak-fire">🔥</span>
            <span className="text-sm font-bold text-white">{dashData?.streak || 0}</span>
          </div>
          <div className="glass-card-light px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-sm">⚡</span>
            <span className="text-sm font-bold text-accent-400">{dashData?.xp || 0}</span>
          </div>
        </div>
      </div>

      {/* Daily Challenge Card */}
      <Link href="/challenge" id="daily-challenge-card">
        <div className="glass-card p-5 mb-4 relative overflow-hidden group cursor-pointer transition-all hover:border-primary-400/30">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-500/10 blur-[50px] group-hover:bg-primary-500/20 transition-all" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Daily Challenge</h2>
                  <p className="text-xs text-surface-200/60">20 Questions • Mixed Topics</p>
                </div>
              </div>
              {dashData?.hasCompletedToday ? (
                <span className="px-3 py-1 rounded-full bg-success-500/20 text-success-500 text-xs font-semibold">
                  ✅ Done
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full gradient-primary text-white text-xs font-semibold animate-pulse-glow">
                  START →
                </span>
              )}
            </div>
            <div className="progress-track">
              <div
                className="progress-fill animate-progress-fill"
                style={{ width: dashData?.hasCompletedToday ? "100%" : "0%" }}
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon="🎯" label="Accuracy" value={`${dashData?.accuracy || 0}%`} color="text-primary-400" />
        <StatCard icon="📚" label="Attempted" value={`${dashData?.totalAttempted || 0}`} color="text-accent-400" />
        <StatCard icon="🔥" label="Streak" value={`${dashData?.streak || 0} days`} color="text-orange-400" />
        <StatCard icon="⚡" label="Total XP" value={`${dashData?.xp || 0}`} color="text-yellow-400" />
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold text-white mb-3">Quick Practice</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/practice" id="quick-topic-practice">
          <ActionCard icon="📖" label="Topic Practice" subtitle="Choose a subject" color="#6366f1" />
        </Link>
        <Link href="/practice/pyq" id="quick-pyq">
          <ActionCard icon="📋" label="Previous Year" subtitle="Real exam papers" color="#f97316" />
        </Link>
      </div>

      {/* Topics Overview */}
      <h2 className="text-lg font-bold text-white mb-3">Topics</h2>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {TOPICS_PREVIEW.map((topic) => (
          <Link
            key={topic.id}
            href={`/practice/${topic.id}`}
            className="flex-shrink-0"
          >
            <div
              className="glass-card-light px-4 py-3 flex flex-col items-center gap-1.5 min-w-[80px] topic-card"
              style={{ borderColor: `${topic.color}30` }}
            >
              <span className="text-2xl">{topic.icon}</span>
              <span className="text-xs text-surface-200 font-medium whitespace-nowrap">
                {topic.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="glass-card-light p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-surface-200/60">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ icon, label, subtitle, color }: { icon: string; label: string; subtitle: string; color: string }) {
  return (
    <div className="glass-card-light p-4 topic-card cursor-pointer" style={{ borderColor: `${color}20` }}>
      <span className="text-2xl mb-2 block">{icon}</span>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-surface-200/50">{subtitle}</p>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning ☀️";
  if (hour < 17) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

const TOPICS_PREVIEW = [
  { id: "history", name: "History", icon: "📖", color: "#E65100" },
  { id: "geography", name: "Geography", icon: "🌍", color: "#2E7D32" },
  { id: "polity", name: "Polity", icon: "⚖️", color: "#1565C0" },
  { id: "science", name: "Science", icon: "🔬", color: "#6A1B9A" },
  { id: "current_affairs", name: "Current", icon: "📰", color: "#C62828" },
  { id: "language", name: "Language", icon: "✍️", color: "#00838F" },
  { id: "reasoning", name: "Reasoning", icon: "🧠", color: "#F57F17" },
  { id: "gk", name: "GK", icon: "💡", color: "#4527A0" },
];
