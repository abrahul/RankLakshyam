"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewQuestion = {
  _id: string;
  text: { en: string; ml: string };
  topicId: string;
  difficulty: number;
  questionStyle: string;
};

export default function UnattemptedQuestionsPage() {
  const [items, setItems] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user/review?filter=unattempted&limit=50");
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to load");
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
        <Link href="/review" className="text-sm text-surface-200/60 hover:text-surface-200 transition-all">
          ← Review
        </Link>
        <Link href="/history" className="text-sm text-primary-400 hover:text-primary-300 transition-all">
          History →
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-2">
        Unattempted Questions
      </h1>
      <p className="text-sm text-surface-200/60 mb-5">
        Questions you skipped in past tests (includes answer + explanation).
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
          <span className="text-4xl block mb-3">⏭️</span>
          <p className="text-surface-200/60">No skipped questions found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((q, idx) => (
            <div key={q._id} className="glass-card-light p-4 animate-fade-in" style={{ animationDelay: `${idx * 15}ms` }}>
              <p className="text-sm font-semibold text-white">{q.text.en}</p>
              {q.text.ml ? <p className="text-xs text-surface-200/60 mt-1">{q.text.ml}</p> : null}
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-surface-200/40">
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{q.topicId}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">style: {q.questionStyle}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">difficulty: {q.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

