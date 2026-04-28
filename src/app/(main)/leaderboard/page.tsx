"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  image?: string;
  score: number;
  streak?: number;
  accuracy?: number;
}

type Period = "daily" | "weekly" | "alltime";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<Period>("daily");
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}`);
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.data.leaderboard);
          setCurrentUser(data.data.currentUser);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchLeaderboard();
  }, [period]);

  return (
    <div className="px-4 pt-6 md:p-10 pb-24 md:pb-10 animate-fade-in max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-6">
        🏆 Leaderboard
      </h1>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6 p-1 glass-card-light rounded-xl">
        {(["daily", "weekly", "alltime"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              period === p
                ? "gradient-primary text-white"
                : "text-surface-200/50 hover:text-surface-200"
            }`}
          >
            {p === "daily" ? "Today" : p === "weekly" ? "This Week" : "All Time"}
          </button>
        ))}
      </div>

      {/* Current User Position */}
      {currentUser && (
        <div className="glass-card p-4 mb-4 border-primary-400/30">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary-400">#{currentUser.rank}</span>
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
              {session?.user?.name?.[0] || "?"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">You</p>
              <p className="text-xs text-surface-200/50">
                {period === "daily" ? `${currentUser.score}/20 correct` : `${currentUser.score} XP`}
              </p>
            </div>
            {currentUser.streak ? (
              <span className="text-sm">🔥 {currentUser.streak}</span>
            ) : null}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">🏆</span>
          <p className="text-surface-200/60">No participants yet today.</p>
          <p className="text-surface-200/40 text-sm">Be the first to complete the challenge!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((user, index) => (
            <div
              key={user.userId}
              className={`glass-card-light p-3 flex items-center gap-3 animate-fade-in ${
                user.userId === session?.user?.id ? "border-primary-400/30" : ""
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {user.rank === 1 ? (
                  <span className="text-xl">🥇</span>
                ) : user.rank === 2 ? (
                  <span className="text-xl">🥈</span>
                ) : user.rank === 3 ? (
                  <span className="text-xl">🥉</span>
                ) : (
                  <span className="text-sm font-bold text-surface-200/60">#{user.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                {user.image ? (
                  <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name[0]
                )}
              </div>

              {/* Name */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">
                  {user.name}
                  {user.userId === session?.user?.id && (
                    <span className="text-xs text-primary-400 ml-1">(You)</span>
                  )}
                </p>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="text-sm font-bold text-primary-400">
                  {period === "daily" ? `${user.score}/20` : `${user.score} XP`}
                </p>
              </div>

              {/* Streak */}
              {user.streak ? (
                <span className="text-xs text-orange-400">🔥{user.streak}</span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
