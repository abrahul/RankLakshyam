"use client";

import { useState } from "react";

interface FreezeShieldProps {
  currentStreak: number;
  freezesRemaining: number;
  hasDoneToday: boolean;
  onFreeze: () => void;
}

export default function FreezeShield({
  currentStreak,
  freezesRemaining,
  hasDoneToday,
  onFreeze,
}: FreezeShieldProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFreeze = async () => {
    if (loading || done || hasDoneToday || freezesRemaining <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/streaks/freeze", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        onFreeze();
      } else {
        alert(data.error?.message || "Could not use freeze");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (hasDoneToday || currentStreak === 0) return null;

  return (
    <div
      className="glass-card-light p-4"
      style={{ borderColor: "rgba(99, 102, 241, 0.2)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "rgba(99, 102, 241, 0.15)" }}
        >
          🛡️
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Streak Freeze</p>
          <p className="text-xs text-surface-200/50">
            {done
              ? "Streak protected for today! ✅"
              : freezesRemaining > 0
              ? `${freezesRemaining} freeze${freezesRemaining > 1 ? "s" : ""} available this week`
              : "No freezes left this week"}
          </p>
        </div>

        {!done && (
          <button
            onClick={handleFreeze}
            disabled={loading || freezesRemaining === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(99, 102, 241, 0.2)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              color: "#818cf8",
            }}
          >
            {loading ? "..." : "Protect 🛡️"}
          </button>
        )}
      </div>

      {/* Shield bar */}
      <div className="flex gap-1.5 mt-3">
        {Array.from({ length: freezesRemaining <= 2 ? 2 : freezesRemaining }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: i < (done ? freezesRemaining - 1 : freezesRemaining)
                ? "rgba(99, 102, 241, 0.6)"
                : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
