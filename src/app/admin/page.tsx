"use client";

import { useEffect, useRef, useState } from "react";

interface StatsData {
  overview: {
    totalUsers: number;
    totalQuestions: number;
    verifiedQuestions: number;
    unverifiedQuestions: number;
    totalAttempts: number;
    todayParticipants: number;
    hasDailyChallenge: boolean;
  };
  topicBreakdown: Array<{ _id: string; count: number; verified: number }>;
  topicMeta: Record<string, { name: string; icon: string; color: string }>;
  recentUsers: Array<{
    _id: string;
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    stats?: { totalXP?: number };
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    fetch("/api/admin/stats")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setData(payload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-surface-200/60 text-center py-10">Failed to load stats</p>;
  }

  const { overview, topicBreakdown, topicMeta, recentUsers } = data;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard icon="👥" label="Total Users" value={overview.totalUsers} />
        <KpiCard icon="❓" label="Total Questions" value={overview.totalQuestions} accent />
        <KpiCard icon="✅" label="Verified" value={overview.verifiedQuestions} color="text-success-500" />
        <KpiCard icon="⚠️" label="Unverified" value={overview.unverifiedQuestions} color="text-amber-400" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
        <KpiCard icon="📝" label="Total Attempts" value={overview.totalAttempts} />
        <KpiCard icon="🏆" label="Today's Players" value={overview.todayParticipants} />
        <KpiCard
          icon={overview.hasDailyChallenge ? "✅" : "❌"}
          label="Daily Challenge"
          value={overview.hasDailyChallenge ? "Active" : "Not Set"}
          color={overview.hasDailyChallenge ? "text-success-500" : "text-error-500"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-4">Questions by Topic</h3>
          <div className="space-y-3">
            {topicBreakdown.map((topic) => (
              <div key={topic._id} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate text-surface-200">
                  {topicMeta[topic._id]?.icon ? `${topicMeta[topic._id].icon} ` : ""}
                  {topicMeta[topic._id]?.name || topic._id}
                </span>
                <div className="flex-1 h-6 rounded-md overflow-hidden bg-white/5 flex">
                  <div
                    className="h-full bg-primary-500/40 flex items-center justify-end px-2"
                    style={{ width: `${(topic.verified / Math.max(topic.count, 1)) * 100}%` }}
                  >
                    <span className="text-[10px] text-primary-300 font-bold">{topic.verified}</span>
                  </div>
                  {topic.count - topic.verified > 0 && (
                    <div
                      className="h-full bg-amber-500/20 flex items-center px-2"
                      style={{ width: `${((topic.count - topic.verified) / Math.max(topic.count, 1)) * 100}%` }}
                    >
                      <span className="text-[10px] text-amber-400/80 font-bold">{topic.count - topic.verified}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs text-surface-200/40 w-8 text-right">{topic.count}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-[10px] text-surface-200/40">
              <span className="w-3 h-3 rounded bg-primary-500/40" /> Verified
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-surface-200/40">
              <span className="w-3 h-3 rounded bg-amber-500/20" /> Unverified
            </span>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-4">Recent Sign-ups</h3>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-surface-200/40 truncate">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-accent-400">{user.stats?.totalXP || 0} XP</p>
                  <p className="text-[10px] text-surface-200/30">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
  accent,
}: {
  icon: string;
  label: string;
  value: number | string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className={`glass-card p-4 ${accent ? "border-primary-400/30" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs text-surface-200/50">{label}</p>
          <p className={`text-xl font-bold ${color || "text-white"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
