"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface QuestionData {
  _id: string;
  text: { en: string; ml: string };
  options: Array<{ key: string; en: string; ml: string }>;
  topicId: string;
  difficulty: number;
}

interface AttemptResult {
  isCorrect: boolean;
  correctOption: string;
  explanation: { en: string; ml: string };
  isComplete: boolean;
  progress: { current: number; total: number; correctCount: number };
}

export default function FocusWrongPage() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "ml" | "both">("both");

  useEffect(() => {
    if (loading || selectedOption || result?.isComplete) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, selectedOption, result?.isComplete]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/focus/wrong");
        const json = await res.json();
        if (!json.success) {
          setError(json.error?.message || "Failed to load focus test");
          return;
        }
        setSessionId(json.data.sessionId);
        setQuestions(json.data.questions);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const submitAnswer = useCallback(async () => {
    if (!selectedOption || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: questions[currentIndex]._id,
          selectedOption,
          timeTakenSec: timer,
        }),
      });
      const json = await res.json();
      if (json.success) setResult(json.data);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [selectedOption, sessionId, submitting, questions, currentIndex, timer]);

  const nextQuestion = () => {
    if (!result) return;
    if (result.isComplete) return;
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setResult(null);
    setTimer(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-6 pb-24">
        <Link href="/review" className="text-sm text-surface-200/60 hover:text-surface-200 transition-all">
          ← Review
        </Link>
        <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30 mt-4">
          <p className="text-sm text-error-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!questions[currentIndex]) {
    return (
      <div className="px-4 pt-6 pb-24 text-center">
        <p className="text-surface-200/60">No questions.</p>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="px-4 pt-6 pb-28 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <Link href="/review/wrong" className="text-sm text-surface-200/60 hover:text-surface-200 transition-all">
          ← Wrong
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-200/40">
            {currentIndex + 1}/{questions.length}
          </span>
          <button
            type="button"
            onClick={() => setLang((l) => (l === "both" ? "en" : l === "en" ? "ml" : "both"))}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-200/10 text-surface-200/60"
          >
            {lang === "en" ? "EN" : lang === "ml" ? "ML" : "EN+ML"}
          </button>
        </div>
      </div>

      <div className="glass-card p-5 mb-6">
        {(lang === "en" || lang === "both") && (
          <p className="text-lg font-semibold text-white leading-relaxed">{q.text.en}</p>
        )}
        {(lang === "ml" || lang === "both") && q.text.ml && (
          <p className={`text-base text-surface-200/70 leading-relaxed ${lang === "both" ? "mt-2 pt-2 border-t border-white/5" : ""}`}>
            {q.text.ml}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {q.options.map((o) => {
          let state = "";
          if (result) {
            if (o.key === result.correctOption) state = "correct";
            else if (o.key === selectedOption && !result.isCorrect) state = "wrong";
          } else if (o.key === selectedOption) {
            state = "selected";
          }

          const badge =
            state === "correct"
              ? "bg-success-500/30 text-success-500"
              : state === "wrong"
                ? "bg-error-500/30 text-error-500"
                : state === "selected"
                  ? "bg-primary-500/30 text-primary-400"
                  : "bg-white/5 text-surface-200/60";

          return (
            <button
              key={o.key}
              onClick={() => !result && setSelectedOption(o.key)}
              disabled={!!result}
              className={`option-btn w-full p-4 text-left flex items-start gap-3 ${state}`}
            >
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${badge}`}>
                {result && o.key === result.correctOption ? "✓" : result && o.key === selectedOption && !result.isCorrect ? "✕" : o.key}
              </span>
              <div className="flex-1">
                {(lang === "en" || lang === "both") && (
                  <p className="text-white text-sm font-medium">{o.en}</p>
                )}
                {(lang === "ml" || lang === "both") && o.ml && (
                  <p className="text-surface-200/50 text-xs mt-0.5">{o.ml}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {result?.explanation ? (
        <div className={`mt-4 p-4 rounded-xl border ${result.isCorrect ? "bg-success-500/10 border-success-500/30" : "bg-error-500/10 border-error-500/30"}`}>
          <p className="text-xs font-semibold mb-1 text-surface-200/60">
            {result.isCorrect ? "✅ Correct" : "❌ Incorrect"}
          </p>
          {(lang === "en" || lang === "both") && <p className="text-sm text-surface-200/80">{result.explanation.en}</p>}
          {(lang === "ml" || lang === "both") && result.explanation.ml && <p className="text-xs text-surface-200/60 mt-2">{result.explanation.ml}</p>}
        </div>
      ) : null}

      <div className="mt-4">
        {!result ? (
          <button
            onClick={submitAnswer}
            disabled={!selectedOption || submitting}
            className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? "Checking..." : "Submit Answer"}
          </button>
        ) : result.isComplete ? (
          <Link
            href="/history"
            className="block w-full text-center py-4 rounded-2xl gradient-primary text-white font-semibold text-base transition-all active:scale-[0.98]"
          >
            View in History →
          </Link>
        ) : (
          <button
            onClick={nextQuestion}
            className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold text-base transition-all active:scale-[0.98]"
          >
            Next Question →
          </button>
        )}
      </div>
    </div>
  );
}

