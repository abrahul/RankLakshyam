"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryItem = {
  _id: string;
  type: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  accuracy: number;
  durationSec: number;
  completedAt: string;
};

export default function TestHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tests/history?limit=30");
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to load history");
          return;
        }
        setItems(json.data);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)]">
          Test History
        </h1>
        <Link
          href="/review"
          className="text-xs text-primary-400 hover:text-primary-300 transition-all"
        >
          Review Center →
        </Link>
      </div>
      <p className="text-sm text-surface-200/60 mb-5">
        Past tests with score, accuracy, and time.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-3">🕘</span>
          <p className="text-surface-200/60">No tests yet.</p>
          <p className="text-surface-200/40 text-sm">Complete a Daily Challenge to see history.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t, idx) => (
            <Link key={t._id} href={`/history/${t._id}`}>
              <div
                className="glass-card p-4 flex items-center justify-between gap-4 topic-card"
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-surface-200/60 uppercase">
                      {t.type}
                    </span>
                    <span className="text-xs text-surface-200/40">
                      {new Date(t.completedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-white font-semibold">
                    {t.correctCount}/{t.totalQuestions} correct
                  </p>
                  <p className="text-xs text-surface-200/50 mt-0.5">
                    ❌ {t.wrongCount} • ⏭️ {t.unattemptedCount} • ⏱️ {Math.round(t.durationSec / 60)} min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-400">{t.accuracy}%</p>
                  <p className="text-[10px] text-surface-200/40">Accuracy</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

