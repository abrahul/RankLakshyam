"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type WeakTopic = { topicId: string; attempts: number; correct: number; wrong: number; accuracy: number };
type WeakStyle = { questionStyle: string; attempts: number; correct: number; wrong: number; accuracy: number };

export default function WeakAreasPage() {
  const [topics, setTopics] = useState<WeakTopic[]>([]);
  const [styles, setStyles] = useState<WeakStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user/weak-areas");
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to load weak areas");
          return;
        }
        setTopics(json.data.weakTopics || []);
        setStyles(json.data.weakStyles || []);
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
        <Link href="/review" className="text-sm text-surface-200/60 hover:text-surface-200 transition-all">
          ← Review
        </Link>
        <Link href="/focus/weak" className="text-sm text-primary-400 hover:text-primary-300 transition-all">
          Focus Mode →
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-2">
        Weak Areas
      </h1>
      <p className="text-sm text-surface-200/60 mb-5">
        Topics and question styles where your accuracy is low (min 5 attempts).
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-surface-200/60 mb-3">Weak Topics</h2>
            {topics.length === 0 ? (
              <p className="text-sm text-surface-200/50">Not enough data yet.</p>
            ) : (
              <div className="space-y-2">
                {topics.map((t) => (
                  <div key={t.topicId} className="glass-card-light p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-semibold">{t.topicId}</span>
                      <span className="text-sm font-bold text-error-500">{t.accuracy}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="h-full rounded-full bg-error-500" style={{ width: `${Math.max(0, Math.min(100, t.accuracy))}%` }} />
                    </div>
                    <p className="text-[11px] text-surface-200/40 mt-2">
                      {t.correct}/{t.attempts} correct
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-surface-200/60 mb-3">Weak Styles</h2>
            {styles.length === 0 ? (
              <p className="text-sm text-surface-200/50">Not enough data yet.</p>
            ) : (
              <div className="space-y-2">
                {styles.map((s) => (
                  <div key={s.questionStyle} className="glass-card-light p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-semibold">{s.questionStyle}</span>
                      <span className="text-sm font-bold text-amber-400">{s.accuracy}%</span>
                    </div>
                    <div className="progress-track">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, s.accuracy))}%` }} />
                    </div>
                    <p className="text-[11px] text-surface-200/40 mt-2">
                      {s.correct}/{s.attempts} correct
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
