"use client";

import { useState } from "react";
import type { BadgeDef } from "@/lib/utils/gamification";
import { RARITY_COLORS } from "@/lib/utils/gamification";

interface BadgeWithStatus extends BadgeDef {
  earned: boolean;
  earnedAt: string | null;
}

interface BadgeGridProps {
  badgesByCategory: Record<string, BadgeWithStatus[]>;
  earnedCount: number;
  totalCount: number;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  streak: { label: "Streaks", icon: "🔥" },
  learning: { label: "Learning", icon: "📚" },
  topic: { label: "Topic Mastery", icon: "📖" },
  leaderboard: { label: "Leaderboard", icon: "🏆" },
  special: { label: "Special", icon: "🎯" },
};

export default function BadgeGrid({ badgesByCategory, earnedCount, totalCount }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithStatus | null>(null);

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-surface-200/60">🏅 Badges</h3>
        <span className="text-xs font-bold text-primary-400">{earnedCount}/{totalCount}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-track mb-5">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-700"
          style={{ width: `${Math.round((earnedCount / totalCount) * 100)}%` }}
        />
      </div>

      {/* Categories */}
      <div className="space-y-5">
        {Object.entries(badgesByCategory).map(([category, badges]) => {
          const { label, icon } = CATEGORY_LABELS[category] || { label: category, icon: "🏅" };
          const categoryEarned = badges.filter((b) => b.earned).length;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">{icon}</span>
                <span className="text-xs font-semibold text-surface-200/50">{label}</span>
                <span className="text-[10px] text-surface-200/30">({categoryEarned}/{badges.length})</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {badges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: badge.earned
                        ? `${RARITY_COLORS[badge.rarity]}15`
                        : "rgba(255,255,255,0.03)",
                      border: badge.earned
                        ? `1px solid ${RARITY_COLORS[badge.rarity]}40`
                        : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      className="text-xl"
                      style={{
                        filter: badge.earned
                          ? `drop-shadow(0 0 6px ${RARITY_COLORS[badge.rarity]}60)`
                          : "grayscale(1) opacity(0.25)",
                      }}
                    >
                      {badge.icon}
                    </span>
                    <span
                      className="text-[8px] font-medium text-center leading-tight line-clamp-1 w-full"
                      style={{ color: badge.earned ? RARITY_COLORS[badge.rarity] : "rgba(226,232,240,0.25)" }}
                    >
                      {badge.earned ? badge.name : "?"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge detail popup */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pb-8 px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 animate-slide-up"
            style={{
              background: "rgba(15, 23, 42, 0.98)",
              border: `1px solid ${RARITY_COLORS[selectedBadge.rarity]}40`,
              boxShadow: `0 24px 64px ${RARITY_COLORS[selectedBadge.rarity]}25`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <span
                className="text-5xl block mb-3"
                style={{
                  filter: selectedBadge.earned
                    ? `drop-shadow(0 0 16px ${RARITY_COLORS[selectedBadge.rarity]}80)`
                    : "grayscale(1) opacity(0.3)",
                }}
              >
                {selectedBadge.icon}
              </span>

              <h4 className="text-lg font-bold text-white mb-1">{selectedBadge.name}</h4>

              <span
                className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-3"
                style={{
                  background: `${RARITY_COLORS[selectedBadge.rarity]}20`,
                  color: RARITY_COLORS[selectedBadge.rarity],
                }}
              >
                {selectedBadge.rarity}
              </span>

              <p className="text-sm text-surface-200/60 mb-4">{selectedBadge.description}</p>

              {selectedBadge.earned ? (
                <p className="text-xs text-success-500">
                  ✅ Earned{" "}
                  {selectedBadge.earnedAt
                    ? new Date(selectedBadge.earnedAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                      })
                    : ""}
                </p>
              ) : (
                <p className="text-xs text-surface-200/40">🔒 Not yet earned</p>
              )}
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full mt-5 py-2.5 rounded-xl text-sm font-medium text-surface-200/60 bg-white/5 hover:bg-white/10 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
