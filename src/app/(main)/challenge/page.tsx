"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function ChallengePage() {
  const router = useRouter();
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

  // Load challenge
  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await fetch("/api/daily-challenge");
        const data = await res.json();

        if (!data.success) {
          setError(data.error?.message || "Failed to load challenge");
          setLoading(false);
          return;
        }

        setQuestions(data.data.questions);

        // If already completed, show results
        if (data.data.existingSession?.status === "completed") {
          setShowResults(true);
          setLoading(false);
          return;
        }

        // Resume or create session
        if (data.data.existingSession) {
          setSessionId(data.data.existingSession.id);
          setCurrentIndex(data.data.existingSession.currentIndex);
        } else {
          // Create new session
          const sessionRes = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "daily",
              questionIds: data.data.questions.map((q: QuestionData) => q._id),
              context: { dailyChallengeDate: data.data.date },
            }),
          });
          const sessionData = await sessionRes.json();
          setSessionId(sessionData.data.sessionId);
          if (sessionData.data.resumed) {
            setCurrentIndex(sessionData.data.currentIndex);
          }
        }

        setLoading(false);
      } catch {
        setError("Failed to load. Please try again.");
        setLoading(false);
      }
    }

    loadChallenge();
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
      // Trigger celebration if there's a milestone
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

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6">
        <div className="w-12 h-12 border-3 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-200/60">Loading today&apos;s challenge...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <span className="text-4xl mb-4">😕</span>
        <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
        <p className="text-surface-200/60 mb-6">{error}</p>
        <Link href="/" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
          Go Home
        </Link>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    const score = finalResult?.progress?.correctCount || 0;
    const total = finalResult?.progress?.total || questions.length;
    const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

    return (
      <div className="px-4 pt-8 pb-24 animate-slide-up">
        {/* Milestone Celebration */}
        {celebration && (
          <MilestoneCelebration
            type={celebration.type}
            title={celebration.title}
            badgeIcon={celebration.badgeIcon}
            bonusXP={celebration.bonusXP}
            onDismiss={() => setCelebration(null)}
          />
        )}

        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">{accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}</span>
          <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-2">
            Challenge Complete!
          </h1>
        </div>

        <div className="glass-card p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-white mb-1">
            {score}<span className="text-2xl text-surface-200/60">/{total}</span>
          </div>
          <p className="text-lg text-primary-400 font-semibold">{accuracy}% Accuracy</p>
          {finalResult?.xp && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-2xl">⚡</span>
                <p className="text-sm font-bold text-accent-400">+{finalResult.xp.totalXP} XP</p>
              </div>
              {finalResult.streak && (
                <div className="text-center">
                  <span className="text-2xl animate-streak-fire">🔥</span>
                  <p className="text-sm font-bold text-orange-400">{finalResult.streak.currentStreak} day streak</p>
                </div>
              )}
            </div>
          )}
        </div>

        {finalResult?.xp && (
          <div className="glass-card-light p-4 mb-6">
            <h3 className="text-sm font-semibold text-surface-200/60 mb-3">XP Breakdown</h3>
            <div className="space-y-2">
              <XPRow label="Base" value={finalResult.xp.baseXP} />
              <XPRow label="Correct Answers" value={finalResult.xp.correctBonus} />
              {finalResult.xp.speedBonus > 0 && <XPRow label="Speed Bonus" value={finalResult.xp.speedBonus} />}
              {finalResult.xp.perfectBonus > 0 && <XPRow label="Perfect Score!" value={finalResult.xp.perfectBonus} />}
              {finalResult.xp.streakBonus > 0 && <XPRow label="Streak Milestone!" value={finalResult.xp.streakBonus} />}
            </div>
          </div>
        )}

        {/* Rank Up */}
        {finalResult?.gamification?.rankUp && (
          <div
            className="glass-card p-5 mb-6 text-center animate-slide-up"
            style={{ borderColor: `${finalResult.gamification.rankUp.to.color}40` }}
          >
            <p className="text-xs text-surface-200/50 mb-2">🎉 RANK UP!</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl opacity-50">{finalResult.gamification.rankUp.from.icon}</span>
              <span className="text-surface-200/40">→</span>
              <span className="text-3xl" style={{ filter: `drop-shadow(0 0 12px ${finalResult.gamification.rankUp.to.color}60)` }}>
                {finalResult.gamification.rankUp.to.icon}
              </span>
            </div>
            <p className="text-lg font-bold text-white mt-2">{finalResult.gamification.rankUp.to.title.en}</p>
          </div>
        )}

        {/* New Badges */}
        {finalResult?.gamification?.newBadges && finalResult.gamification.newBadges.length > 0 && (
          <div className="glass-card-light p-4 mb-6 animate-slide-up">
            <h3 className="text-sm font-semibold text-surface-200/60 mb-3">🏅 Badges Earned!</h3>
            <div className="space-y-2">
              {finalResult.gamification.newBadges.map((badge) => (
                <div key={badge.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{badge.name}</p>
                    <p className="text-[10px] uppercase font-bold" style={{ color: badge.rarity === "legendary" ? "#f59e0b" : badge.rarity === "epic" ? "#a855f7" : badge.rarity === "rare" ? "#3b82f6" : "#94a3b8" }}>
                      {badge.rarity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/" className="flex-1 py-3 text-center rounded-xl glass-card-light text-white font-semibold">
            Home
          </Link>
          <Link href="/performance" className="flex-1 py-3 text-center rounded-xl gradient-primary text-white font-semibold">
            View Stats
          </Link>
        </div>
      </div>
    );
  }

  // Quiz screen
  const question = questions[currentIndex];
  if (!question) return null;

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="text-surface-200/60 text-sm">← Back</Link>
          <span className="text-sm font-medium text-surface-200">
            Q {currentIndex + 1}/{questions.length}
          </span>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-surface-200/40">⏱</span>
            <span className="text-surface-200 font-mono font-medium">{timer}s</span>
          </div>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex + (result ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 pt-4 pb-6 flex flex-col">
        {/* Topic badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary-500/20 text-primary-300">
            {question.topicId.replace("_", " ").toUpperCase()}
          </span>
          <button
            onClick={() => setLang((l) => l === "en" ? "ml" : l === "ml" ? "both" : "en")}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-200/10 text-surface-200/60"
          >
            {lang === "en" ? "EN" : lang === "ml" ? "ML" : "EN+ML"}
          </button>
        </div>

        {/* Question text */}
        <div className="glass-card p-5 mb-6 animate-fade-in">
          {(lang === "en" || lang === "both") && (
            <p className="text-lg font-semibold text-white leading-relaxed">
              {question.text.en}
            </p>
          )}
          {(lang === "ml" || lang === "both") && question.text.ml && (
            <p className={`text-base text-surface-200/70 leading-relaxed ${lang === "both" ? "mt-2 pt-2 border-t border-white/5" : ""}`}>
              {question.text.ml}
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 flex-1">
          {question.options.map((option) => {
            let stateClass = "";
            if (result) {
              if (option.key === result.correctOption) stateClass = "correct animate-correct-pop";
              else if (option.key === selectedOption && !result.isCorrect) stateClass = "wrong animate-wrong-shake";
            } else if (option.key === selectedOption) {
              stateClass = "selected";
            }

            return (
              <button
                key={option.key}
                onClick={() => !result && setSelectedOption(option.key)}
                disabled={!!result}
                className={`option-btn w-full p-4 text-left flex items-start gap-3 ${stateClass}`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  stateClass === "correct" ? "bg-success-500/30 text-success-500" :
                  stateClass.includes("wrong") ? "bg-error-500/30 text-error-500" :
                  stateClass === "selected" ? "bg-primary-500/30 text-primary-400" :
                  "bg-white/5 text-surface-200/60"
                }`}>
                  {result && option.key === result.correctOption ? "✓" :
                   result && option.key === selectedOption && !result.isCorrect ? "✗" :
                   option.key}
                </span>
                <div className="flex-1">
                  {(lang === "en" || lang === "both") && (
                    <p className="text-white text-sm font-medium">{option.en}</p>
                  )}
                  {(lang === "ml" || lang === "both") && option.ml && (
                    <p className="text-surface-200/50 text-xs mt-0.5">{option.ml}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {result && result.explanation && (
          <div className={`mt-4 p-4 rounded-xl border animate-slide-up ${
            result.isCorrect
              ? "bg-success-500/10 border-success-500/30"
              : "bg-error-500/10 border-error-500/30"
          }`}>
            <p className="text-xs font-semibold mb-1 text-surface-200/60">
              {result.isCorrect ? "✅ Correct!" : "❌ Incorrect"}
            </p>
            {(lang === "en" || lang === "both") && (
              <p className="text-sm text-surface-200/80">{result.explanation.en}</p>
            )}
            {(lang === "ml" || lang === "both") && result.explanation.ml && (
              <p className="text-xs text-surface-200/50 mt-1">{result.explanation.ml}</p>
            )}
          </div>
        )}

        {/* Action button */}
        <div className="mt-4">
          {!result ? (
            <button
              onClick={submitAnswer}
              disabled={!selectedOption || submitting}
              className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking...
                </span>
              ) : (
                "Submit Answer"
              )}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="w-full py-4 rounded-2xl gradient-primary text-white font-semibold text-base transition-all active:scale-[0.98]"
            >
              {result.isComplete ? "View Results" : "Next Question →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function XPRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-surface-200/60">{label}</span>
      <span className="font-semibold text-accent-400">+{value}</span>
    </div>
  );
}
