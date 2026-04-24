"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PerformanceData {
  overall: {
    totalAttempted: number;
    totalCorrect: number;
    accuracy: number;
    avgTimePerQuestion: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
  };
  weeklyTrend: Array<{
    date: string;
    accuracy: number;
    questionsAttempted: number;
    avgTimeSec: number;
  }>;
  weakAreas: Array<{ topic: string; attempted: number; correct: number; accuracy: number }>;
  strongAreas: Array<{ topic: string; attempted: number; correct: number; accuracy: number }>;
}

type TopicRow = {
  id: string;
  name: { en: string; ml: string };
  icon: string;
};

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [topicLabels, setTopicLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPerformance() {
      try {
        const [performanceRes, topicsRes] = await Promise.all([fetch("/api/performance"), fetch("/api/topics")]);
        const performancePayload = await performanceRes.json();
        const topicsPayload = await topicsRes.json();

        if (performancePayload.success) setData(performancePayload.data);
        if (topicsPayload.success) {
          setTopicLabels(
            Object.fromEntries(
              (topicsPayload.data as TopicRow[]).map((topic) => [
                topic.id,
                `${topic.icon ? `${topic.icon} ` : ""}${topic.name.en}`,
              ])
            )
          );
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 pt-6 text-center">
        <span className="text-4xl block mb-4">📊</span>
        <h2 className="text-xl font-bold text-white mb-2">No Data Yet</h2>
        <p className="text-surface-200/60">Complete your first daily challenge to see analytics!</p>
      </div>
    );
  }

  const { overall, weeklyTrend, weakAreas, strongAreas } = data;

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-6">Performance</h1>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <Link href="/history" className="glass-card-light p-3 text-center topic-card">
          <span className="text-lg block mb-1">🕘</span>
          <p className="text-[11px] font-semibold text-white">History</p>
        </Link>
        <Link href="/review" className="glass-card-light p-3 text-center topic-card">
          <span className="text-lg block mb-1">🧾</span>
          <p className="text-[11px] font-semibold text-white">Review</p>
        </Link>
        <Link href="/weak-areas" className="glass-card-light p-3 text-center topic-card">
          <span className="text-lg block mb-1">📉</span>
          <p className="text-[11px] font-semibold text-white">Weak</p>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <StatBox label="Accuracy" value={`${overall.accuracy}%`} icon="🎯" />
        <StatBox label="Speed" value={`${overall.avgTimePerQuestion}s`} icon="⚡" />
        <StatBox label="Total XP" value={`${overall.totalXP}`} icon="💎" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-surface-200/60 mb-1">Questions Done</p>
          <p className="text-2xl font-bold text-white">{overall.totalAttempted}</p>
          <p className="text-xs text-surface-200/40">{overall.totalCorrect} correct</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-surface-200/60 mb-1">Streaks</p>
          <p className="text-2xl font-bold text-orange-400">🔥 {overall.currentStreak}</p>
          <p className="text-xs text-surface-200/40">Best: {overall.longestStreak} days</p>
        </div>
      </div>

      {weeklyTrend.length > 0 && (
        <div className="glass-card p-4 mb-6">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-4">7-Day Accuracy Trend</h3>
          <div className="flex items-end gap-1 h-24">
            {weeklyTrend.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-primary-400 font-bold">{day.accuracy}%</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all"
                  style={{ height: `${Math.max(day.accuracy * 0.8, 4)}%` }}
                />
                <span className="text-[9px] text-surface-200/40">
                  {new Date(day.date).toLocaleDateString("en", { weekday: "short" }).slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {weakAreas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-3">⚠️ Needs Improvement</h3>
          <div className="space-y-2">
            {weakAreas.map((area) => (
              <TopicBar
                key={area.topic}
                label={topicLabels[area.topic] || area.topic}
                accuracy={area.accuracy}
                attempted={area.attempted}
                color="#ef4444"
              />
            ))}
          </div>
        </div>
      )}

      {strongAreas.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-surface-200/60 mb-3">💪 Strong Areas</h3>
          <div className="space-y-2">
            {strongAreas.map((area) => (
              <TopicBar
                key={area.topic}
                label={topicLabels[area.topic] || area.topic}
                accuracy={area.accuracy}
                attempted={area.attempted}
                color="#22c55e"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-card-light p-3 text-center">
      <span className="text-lg block mb-1">{icon}</span>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] text-surface-200/50">{label}</p>
    </div>
  );
}

function TopicBar({
  label,
  accuracy,
  attempted,
  color,
}: {
  label: string;
  accuracy: number;
  attempted: number;
  color: string;
}) {
  return (
    <div className="glass-card-light p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-surface-200">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>
          {accuracy}%
        </span>
      </div>
      <div className="progress-track">
        <div className="h-full rounded-full" style={{ width: `${accuracy}%`, background: color }} />
      </div>
      <p className="text-[10px] text-surface-200/40 mt-1">{attempted} questions attempted</p>
    </div>
  );
}
