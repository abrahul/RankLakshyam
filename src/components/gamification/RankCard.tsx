"use client";

import type { Rank } from "@/lib/utils/gamification";

interface RankCardProps {
  current: Rank;
  next: Rank | null;
  progress: number;
  xpToNext: number;
  totalXP: number;
}

export default function RankCard({ current, next, progress, xpToNext, totalXP }: RankCardProps) {
  return (
    <div
      className="glass-card p-5"
      style={{ borderColor: `${current.color}30` }}
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Rank icon with glow */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
          style={{
            background: `${current.color}15`,
            border: `1px solid ${current.color}40`,
            boxShadow: `0 0 20px ${current.color}25`,
          }}
        >
          {current.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-bold text-white">{current.title.en}</h3>
            <span className="text-xs font-medium" style={{ color: current.color }}>
              Lvl {current.level}
            </span>
          </div>
          <p className="text-sm" style={{ color: `${current.color}90` }}>
            {current.title.ml}
          </p>
          <p className="text-xs text-surface-200/40 mt-0.5">
            ⚡ {totalXP.toLocaleString()} total XP
          </p>
        </div>
      </div>

      {/* Progress to next rank */}
      {next ? (
        <>
          <div className="flex items-center justify-between text-xs mb-2">
            <span style={{ color: current.color }}>{current.icon} {current.title.en}</span>
            <span className="text-surface-200/40">{xpToNext.toLocaleString()} XP to next</span>
            <span style={{ color: next.color }}>{next.icon} {next.title.en}</span>
          </div>

          <div className="progress-track">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
              }}
            />
          </div>

          <p className="text-[10px] text-surface-200/30 text-center mt-2">
            {progress}% progress to {next.title.en}
          </p>
        </>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm font-semibold" style={{ color: current.color }}>
            🎓 Maximum Rank Achieved!
          </p>
          <p className="text-xs text-surface-200/40">You are in the top tier of PSC aspirants</p>
        </div>
      )}
    </div>
  );
}
