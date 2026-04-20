"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReviewRow = {
  questionId: string;
  selectedOption: "A" | "B" | "C" | "D" | null;
  correctOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  timeTakenSec: number;
  status: "correct" | "wrong" | "unattempted";
  question: null | {
    text: { en: string; ml: string };
    options: Array<{ key: string; en: string; ml: string }>;
    explanation?: { en: string; ml: string };
    topicId?: string;
  };
};

export default function TestReviewPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    unattemptedCount: number;
    accuracy: number;
    durationSec: number;
    completedAt: string;
  } | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tests/${params.id}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to load review");
          return;
        }
        setSummary(json.data.attempt);
        setRows(json.data.questions);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  return (
    <div className="px-4 pt-6 pb-28 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <Link href="/history" className="text-sm text-surface-200/60 hover:text-surface-200 transition-all">
          ← History
        </Link>
        <Link href="/review" className="text-sm text-primary-400 hover:text-primary-300 transition-all">
          Review Center →
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      ) : !summary ? (
        <div className="text-center py-12 text-surface-200/60">No data.</div>
      ) : (
        <>
          <div className="glass-card p-5 mb-5">
            <p className="text-xs text-surface-200/50 mb-2">
              Completed{" "}
              {new Date(summary.completedAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-white">
                  {summary.correctCount}/{summary.totalQuestions}
                </p>
                <p className="text-xs text-surface-200/50">
                  ❌ {summary.wrongCount} • ⏭️ {summary.unattemptedCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-400">{summary.accuracy}%</p>
                <p className="text-[11px] text-surface-200/40">Accuracy</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {rows.map((r, idx) => {
              const tone =
                r.status === "correct"
                  ? "border-success-500/30 bg-success-500/10"
                  : r.status === "wrong"
                    ? "border-error-500/30 bg-error-500/10"
                    : "border-white/10 bg-white/5";

              return (
                <div key={r.questionId} className={`rounded-2xl border p-4 ${tone}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-surface-200/50 font-semibold">Q{idx + 1}</span>
                    <span className="text-xs text-surface-200/40">
                      {r.status === "correct" ? "✅ Correct" : r.status === "wrong" ? "❌ Wrong" : "⏭️ Skipped"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{r.question?.text.en || "Question unavailable"}</p>
                    {r.question?.text.ml ? (
                      <p className="text-xs text-surface-200/60">{r.question.text.ml}</p>
                    ) : null}
                  </div>

                  {r.question ? (
                    <div className="mt-3 space-y-2">
                      {r.question.options.map((o) => {
                        const isCorrect = o.key === r.correctOption;
                        const isSelected = r.selectedOption === o.key;
                        const cls = isCorrect
                          ? "border-success-500/30 bg-success-500/10"
                          : isSelected && !r.isCorrect
                            ? "border-error-500/30 bg-error-500/10"
                            : "border-white/10 bg-white/5";

                        return (
                          <div key={o.key} className={`p-3 rounded-xl border ${cls}`}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm text-surface-200/90">
                                <span className="text-surface-200/50 mr-2">{o.key}.</span>
                                {o.en}
                              </p>
                              <div className="text-[10px] text-surface-200/50">
                                {isCorrect ? "Correct" : isSelected ? "You" : ""}
                              </div>
                            </div>
                            {o.ml ? <p className="text-[11px] text-surface-200/50 mt-1">{o.ml}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {r.question?.explanation?.en ? (
                    <div className="mt-3 glass-card-light p-3">
                      <p className="text-[11px] text-surface-200/50 font-semibold mb-1">Explanation</p>
                      <p className="text-sm text-surface-200/80">{r.question.explanation.en}</p>
                      {r.question.explanation.ml ? (
                        <p className="text-xs text-surface-200/60 mt-2">{r.question.explanation.ml}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

