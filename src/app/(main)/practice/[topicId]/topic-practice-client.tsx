"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MilestoneCelebration = dynamic(
  () => import("@/components/gamification/MilestoneCelebration"),
  { ssr: false }
);

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
  xp?: { totalXP: number; baseXP: number; correctBonus: number; speedBonus: number; perfectBonus: number; streakBonus: number };
  streak?: { currentStreak: number; longestStreak: number };
  gamification?: {
    newBadges?: Array<{ id: string; name: string; icon: string; rarity: string }>;
    milestone?: { title: string; badgeIcon: string; bonusXP: number; celebration: "toast" | "confetti" | "fullscreen" };
    rankUp?: { from: { title: { en: string }; icon: string }; to: { title: { en: string }; icon: string; color: string } };
  };
}

export default function TopicPracticeClient({
  topicId,
  subTopic,
  exam,
}: {
  topicId: string;
  subTopic?: string;
  exam?: string;
}) {
  const router = useRouter();
  const topicLabel = useMemo(() => {
    let label = topicId.replaceAll("_", " ").toUpperCase();
    if (subTopic) label += ` › ${subTopic.replaceAll("_", " ")}`;
    if (exam) label += ` [${exam.toUpperCase()}]`;
    return label;
  }, [topicId, subTopic, exam]);

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [finalResult, setFinalResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "ml" | "both">("both");
  const [celebration, setCelebration] = useState<{
    type: "toast" | "confetti" | "fullscreen";
    title: string;
    badgeIcon: string;
    bonusXP: number;
  } | null>(null);

  // Timer
  useEffect(() => {
    if (loading || selectedOption || showResults) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, selectedOption, showResults]);

  // Load topic questions + create a session
  useEffect(() => {
    async function loadTopicPractice() {
      try {
        const params = new URLSearchParams({ topic: topicId, limit: "20", page: "1" });
        if (subTopic) params.set("subTopic", subTopic);
        if (exam) params.set("exam", exam);
        const res = await fetch(`/api/questions?${params}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error?.message || "Failed to load questions");
          setLoading(false);
          return;
        }

        const q: QuestionData[] = data.data || [];
        if (!q.length) {
          setError("No questions available for this topic yet.");
          setLoading(false);
          return;
        }

        setQuestions(q);

        const sessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "topic",
            questionIds: q.map((qq) => qq._id),
            context: { topicId },
          }),
        });
        const sessionData = await sessionRes.json();
        if (!sessionData.success) {
          setError(sessionData.error?.message || "Failed to create session");
          setLoading(false);
          return;
        }

        setSessionId(sessionData.data.sessionId);
        setCurrentIndex(sessionData.data.currentIndex || 0);
        setLoading(false);
      } catch {
        setError("Failed to load. Please try again.");
        setLoading(false);
      }
    }

    setLoading(true);
    setError(null);
    setShowResults(false);
    setFinalResult(null);
    setResult(null);
    setSelectedOption(null);
    setTimer(0);
    setCurrentIndex(0);
    setSessionId(null);
    setQuestions([]);

    loadTopicPractice();
  }, [topicId, subTopic, exam]);

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

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        if (data.data.isComplete) {
          setFinalResult(data.data);
        }
      }
    } catch {
      // Silent fail - user can retry
    } finally {
      setSubmitting(false);
    }
  }, [selectedOption, sessionId, submitting, questions, currentIndex, timer]);

  const nextQuestion = () => {
    if (result?.isComplete) {
      if (finalResult?.gamification?.milestone) {
        const m = finalResult.gamification.milestone;
        setCelebration({
          type: m.celebration,
          title: m.title,
          badgeIcon: m.badgeIcon || "🎉",
          bonusXP: m.bonusXP,
        });
      }
      setShowResults(true);
      return;
    }
    setSelectedOption(null);
    setResult(null);
    setTimer(0);
    setCurrentIndex((i) => i + 1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6">
        <div className="w-12 h-12 border-3 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-200/60">Loading topic practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <span className="text-4xl mb-4">😕</span>
        <h2 className="text-xl font-bold text-white mb-2">Topic Practice</h2>
        <p className="text-surface-200/60 mb-6">{error}</p>
        <Link href="/practice" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
          Back to Practice
        </Link>
      </div>
    );
  }

  if (showResults && finalResult) {
    const accuracy = Math.round((finalResult.progress.correctCount / finalResult.progress.total) * 100);
    return (
      <div className="min-h-dvh px-4 pt-6 pb-24 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/practice")}
            className="text-surface-200/60 hover:text-surface-200 transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-surface-200/40">{topicLabel}</span>
        </div>

        <div className="glass-card p-6 text-center">
          <span className="text-5xl block mb-4">🏁</span>
          <h1 className="text-2xl font-bold text-white mb-1">Session Complete</h1>
          <p className="text-surface-200/60 mb-6">
            {finalResult.progress.correctCount} / {finalResult.progress.total} correct ({accuracy}%)
          </p>

          {finalResult.xp && (
            <div className="glass-card-light p-4 mb-4">
              <p className="text-xs text-surface-200/60 mb-1">XP Earned</p>
              <p className="text-2xl font-bold text-accent-400">+{finalResult.xp.totalXP}</p>
            </div>
          )}

          <Link href="/practice" className="inline-flex px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
            Practice More
          </Link>
        </div>

        {celebration ? (
          <MilestoneCelebration
            type={celebration.type}
            title={celebration.title}
            badgeIcon={celebration.badgeIcon}
            bonusXP={celebration.bonusXP}
            onClose={() => setCelebration(null)}
          />
        ) : null}
      </div>
    );
  }

  const current = questions[currentIndex];
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <span className="text-4xl mb-4">😕</span>
        <h2 className="text-xl font-bold text-white mb-2">Practice</h2>
        <p className="text-surface-200/60 mb-6">This session looks out of sync. Please start again.</p>
        <Link href="/practice" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
          Back to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => router.push("/practice")}
          className="text-surface-200/60 hover:text-surface-200 transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang((l) => (l === "both" ? "en" : l === "en" ? "ml" : "both"))}
            className="glass-card-light px-3 py-1.5 text-xs font-semibold text-surface-200/70 hover:text-surface-200 transition-all"
            aria-label="Toggle language"
          >
            {lang === "both" ? "EN+ML" : lang.toUpperCase()}
          </button>
          <span className="text-xs text-surface-200/40">{topicLabel}</span>
        </div>
      </div>

      <div className="glass-card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-surface-200/60">
            Question {currentIndex + 1} / {questions.length}
          </p>
          <p className="text-xs text-surface-200/50">{timer}s</p>
        </div>

        <div className="space-y-1.5">
          {lang !== "ml" ? (
            <p className="text-white font-semibold leading-relaxed">{current.text.en}</p>
          ) : null}
          {lang !== "en" ? (
            <p className="text-surface-200/80 leading-relaxed">{current.text.ml}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {current.options.map((opt, idx) => {
          const fallbackKey = ["A", "B", "C", "D"][idx] || "A";
          const optionKey =
            (typeof (opt as unknown as { key?: unknown }).key === "string"
              ? ((opt as unknown as { key: string }).key || fallbackKey).toUpperCase()
              : fallbackKey);

          let stateClass = "";
          if (result) {
            if (optionKey === result.correctOption) stateClass = "correct animate-correct-pop";
            else if (optionKey === selectedOption && !result.isCorrect) stateClass = "wrong animate-wrong-shake";
          } else if (optionKey === selectedOption) {
            stateClass = "selected";
          }

          return (
            <button
              key={`${optionKey}-${idx}`}
              type="button"
              disabled={!!result}
              onClick={() => !result && setSelectedOption(optionKey)}
              className={`option-btn w-full p-4 text-left flex items-start gap-3 ${stateClass}`}
            >
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  stateClass === "correct" ? "bg-success-500/30 text-success-500" :
                  stateClass.includes("wrong") ? "bg-error-500/30 text-error-500" :
                  stateClass === "selected" ? "bg-primary-500/30 text-primary-400" :
                  "bg-white/5 text-surface-200/60"
                }`}
              >
                {result && optionKey === result.correctOption ? "✓" :
                 result && optionKey === selectedOption && !result.isCorrect ? "✕" :
                 optionKey}
              </span>
              <div className="flex-1">
                {lang !== "ml" ? <p className="text-white text-sm font-medium">{opt.en}</p> : null}
                {lang !== "en" ? <p className="text-surface-200/50 text-xs mt-0.5">{opt.ml}</p> : null}
              </div>
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="glass-card p-5 mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-bold ${result.isCorrect ? "text-success-500" : "text-danger-500"}`}>
              {result.isCorrect ? "Correct" : "Wrong"}
            </p>
            <p className="text-xs text-surface-200/50">
              {result.progress.current}/{result.progress.total} • {result.progress.correctCount} correct
            </p>
          </div>
          <div className="space-y-1.5">
            {lang !== "ml" ? <p className="text-surface-200/80 text-sm">{result.explanation.en}</p> : null}
            {lang !== "en" ? <p className="text-surface-200/70 text-sm">{result.explanation.ml}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="flex gap-3">
        {!result ? (
          <button
            type="button"
            disabled={!selectedOption || submitting}
            onClick={submitAnswer}
            className="flex-1 px-6 py-3 rounded-xl gradient-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Checking..." : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextQuestion}
            className="flex-1 px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
          >
            {result.isComplete ? "Finish" : "Next →"}
          </button>
        )}
      </div>
    </div>
  );
}
