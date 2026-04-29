"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const MilestoneCelebration = dynamic(
  () => import("@/components/gamification/MilestoneCelebration"),
  { ssr: false }
);

import { useReportStore } from "@/lib/store/useReportStore";

interface QuestionData {
  _id: string;
  text: { en: string; ml: string };
  options: Array<{ key: string; en: string; ml: string }>;
  topicId: string;
  difficulty: number;
  exam?: string;
  examCode?: string;
  examTags?: Array<string | { _id?: string; name?: string; code?: string | null }>;
  examAskedIn?: string[];
}

interface ProgressData {
  current: number;
  total: number;
  correctCount: number;
  wrongCount?: number;
  skippedCount?: number;
  attemptedCount?: number;
}

interface AttemptResult {
  skipped?: boolean;
  isCorrect: boolean;
  correctOption: string;
  explanation: { en: string; ml: string };
  isComplete: boolean;
  progress: ProgressData;
  xp?: { totalXP: number; baseXP: number; correctBonus: number; speedBonus: number; perfectBonus: number; streakBonus: number };
  streak?: { currentStreak: number; longestStreak: number };
  gamification?: {
    newBadges?: Array<{ id: string; name: string; icon: string; rarity: string }>;
    milestone?: { title: string; badgeIcon: string; bonusXP: number; celebration: "toast" | "confetti" | "fullscreen" };
    rankUp?: { from: { title: { en: string }; icon: string }; to: { title: { en: string }; icon: string; color: string } };
  };
}

type AnswerState = Pick<AttemptResult, "isCorrect" | "correctOption" | "explanation" | "progress"> & {
  selectedOption: string;
};

export default function TopicPracticeClient({
  topicId,
  subTopic,
  categoryId,
}: {
  topicId: string;
  subTopic?: string;
  categoryId?: string;
}) {
  const router = useRouter();
  const normalizedTopicId = useMemo(() => {
    try {
      return decodeURIComponent(topicId);
    } catch {
      return topicId;
    }
  }, [topicId]);
  const topicLabel = useMemo(() => {
    let label = normalizedTopicId.replaceAll("_", " ").toUpperCase();
    if (subTopic) label += ` > ${subTopic.replaceAll("_", " ")}`;
    if (categoryId) label += ` | ${categoryId.replaceAll("_", " ")}`;
    return label;
  }, [normalizedTopicId, subTopic, categoryId]);

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [finalResult, setFinalResult] = useState<AttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "ml" | "both">("both");
  const [navOpen, setNavOpen] = useState(false);
  const [celebration, setCelebration] = useState<{
    type: "toast" | "confetti" | "fullscreen";
    title: string;
    badgeIcon: string;
    bonusXP: number;
  } | null>(null);
  const openReport = useReportStore((s) => s.openReport);

  const current = questions[currentIndex];
  const currentId = current?._id || "";
  const currentAnswer = currentId ? answers[currentId] : undefined;
  const isCurrentSkipped = currentId ? skippedIds.has(currentId) : false;

  const summary = useMemo(() => {
    const values = Object.values(answers);
    const correct = values.filter((item) => item.isCorrect).length;
    const attempted = values.length;
    const skipped = skippedIds.size;
    return {
      correct,
      wrong: attempted - correct,
      skipped,
      attempted,
      completed: attempted + skipped,
      total: questions.length,
    };
  }, [answers, skippedIds, questions.length]);

  useEffect(() => {
    if (loading || showResults || currentAnswer) return;
    const interval = setInterval(() => setTimer((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, showResults, currentAnswer]);

  useEffect(() => {
    if (!currentId) return;
    setVisitedIds((previous) => new Set(previous).add(currentId));
  }, [currentId]);

  useEffect(() => {
    async function loadTopicPractice() {
      try {
        const buildParams = (page: number, pageLimit = 500) => {
          const params = new URLSearchParams({ topic: normalizedTopicId, page: String(page) });
          params.set("all", "1");
          params.set("limit", String(pageLimit));
          if (subTopic) params.set("subTopic", subTopic);
          if (categoryId) params.set("categoryId", categoryId);
          return params;
        };

        let loadedQuestions: QuestionData[] = [];

        let page = 1;
        let total = 0;
        while (page <= 1000) {
          const res = await fetch(`/api/questions?${buildParams(page)}`);
          const data = await res.json();

          if (!data.success) {
            setError(data.error?.message || "Failed to load questions");
            setLoading(false);
            return;
          }

          const batch: QuestionData[] = data.data || [];
          loadedQuestions = loadedQuestions.concat(batch);
          total = Number(data.meta?.total || loadedQuestions.length);
          if (batch.length === 0 || loadedQuestions.length >= total) break;
          page += 1;
        }
        loadedQuestions = Array.from(new Map(loadedQuestions.map((question) => [question._id, question])).values());

        if (!loadedQuestions.length) {
          setError("No practice questions available for these filters.");
          setLoading(false);
          return;
        }

        setQuestions(loadedQuestions);

        const sessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "topic",
            questionIds: loadedQuestions.map((question) => question._id),
            context: { topicId: normalizedTopicId, subTopic, categoryId, all: "1" },
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
        setVisitedIds(new Set([loadedQuestions[sessionData.data.currentIndex || 0]?._id].filter(Boolean)));
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
    setAnswers({});
    setSkippedIds(new Set());
    setVisitedIds(new Set());

    void loadTopicPractice();
  }, [normalizedTopicId, subTopic, categoryId]);

  const goToQuestion = useCallback(
    (index: number, nextAnswers = answers, nextSkipped = skippedIds) => {
      const safeIndex = Math.min(Math.max(index, 0), questions.length - 1);
      const target = questions[safeIndex];
      if (!target) return;
      const answer = nextAnswers[target._id];
      setCurrentIndex(safeIndex);
      setSelectedOption(answer?.selectedOption || null);
      setResult(answer ? { ...answer, isComplete: summary.completed >= questions.length } : null);
      setTimer(0);
      setVisitedIds((previous) => new Set(previous).add(target._id));
      setSkippedIds(nextSkipped);
      setNavOpen(false);
    },
    [answers, questions, skippedIds, summary.completed]
  );

  const findNextOpenIndex = useCallback(
    (fromIndex: number, nextAnswers: Record<string, AnswerState>, nextSkipped: Set<string>) => {
      for (let offset = 1; offset <= questions.length; offset += 1) {
        const index = (fromIndex + offset) % questions.length;
        const id = questions[index]?._id;
        if (id && !nextAnswers[id] && !nextSkipped.has(id)) return index;
      }
      return Math.min(fromIndex + 1, questions.length - 1);
    },
    [questions]
  );

  const submitAnswer = useCallback(async () => {
    if (!current || !selectedOption || !sessionId || submitting || currentAnswer) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: current._id,
          selectedOption,
          timeTakenSec: timer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const payload: AttemptResult = data.data;
        const nextAnswers = {
          ...answers,
          [current._id]: {
            selectedOption,
            isCorrect: payload.isCorrect,
            correctOption: payload.correctOption,
            explanation: payload.explanation,
            progress: payload.progress,
          },
        };
        const nextSkipped = new Set(skippedIds);
        nextSkipped.delete(current._id);
        setAnswers(nextAnswers);
        setSkippedIds(nextSkipped);
        setResult(payload);
        if (payload.isComplete) setFinalResult(payload);
      }
    } catch {
      // Keep the current selection so the user can retry.
    } finally {
      setSubmitting(false);
    }
  }, [answers, current, currentAnswer, selectedOption, sessionId, skippedIds, submitting, timer]);

  const skipQuestion = useCallback(async () => {
    if (!current || !sessionId || submitting || currentAnswer) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId: current._id,
          action: "skip",
          selectedOption: null,
          timeTakenSec: timer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const nextSkipped = new Set(skippedIds).add(current._id);
        setSkippedIds(nextSkipped);
        setSelectedOption(null);
        setResult(null);
        if (data.data?.isComplete) {
          setFinalResult(data.data);
          return;
        }
        goToQuestion(findNextOpenIndex(currentIndex, answers, nextSkipped), answers, nextSkipped);
      }
    } catch {
      // Keep the question in place so the user can retry.
    } finally {
      setSubmitting(false);
    }
  }, [answers, current, currentAnswer, currentIndex, findNextOpenIndex, goToQuestion, sessionId, skippedIds, submitting, timer]);

  const finishSession = useCallback(async () => {
    if (summary.completed < questions.length || finishing) return;
    setFinishing(true);
    try {
      if (sessionId) {
        await fetch("/api/tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, forceComplete: true }),
        });
      }
    } catch {
      // History snapshot is best-effort; local results are still available.
    } finally {
      if (finalResult?.gamification?.milestone) {
        const milestone = finalResult.gamification.milestone;
        setCelebration({
          type: milestone.celebration,
          title: milestone.title,
          badgeIcon: milestone.badgeIcon || "*",
          bonusXP: milestone.bonusXP,
        });
      }
      setShowResults(true);
      setFinishing(false);
    }
  }, [finalResult, finishing, questions.length, sessionId, summary.completed]);

  const nextQuestion = () => {
    if (summary.completed >= questions.length) {
      void finishSession();
      return;
    }
    goToQuestion(Math.min(currentIndex + 1, questions.length - 1));
  };

  const previousQuestion = () => {
    goToQuestion(Math.max(currentIndex - 1, 0));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6">
        <div className="w-12 h-12 border-3 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-200/60">Loading practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <span className="text-4xl mb-4">!</span>
        <h2 className="text-xl font-bold text-white mb-2">Practice</h2>
        <p className="text-surface-200/60 mb-6">{error}</p>
        <Link href="/practice" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
          Back to Practice
        </Link>
      </div>
    );
  }

  if (showResults) {
    const accuracy = summary.attempted ? Math.round((summary.correct / summary.attempted) * 100) : 0;
    return (
      <div className="min-h-dvh px-4 pt-6 pb-24 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.push("/practice")}
            className="text-surface-200/60 hover:text-surface-200 transition-colors"
          >
            Back
          </button>
          <span className="text-xs text-surface-200/40">{topicLabel}</span>
        </div>

        <div className="glass-card p-6 text-center">
          <span className="text-5xl block mb-4">#</span>
          <h1 className="text-2xl font-bold text-white mb-1">Session Complete</h1>
          <p className="text-surface-200/60 mb-6">
            {summary.correct} correct out of {summary.attempted} attempted ({accuracy}%)
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <ResultStat label="Correct" value={summary.correct} tone="text-success-500" />
            <ResultStat label="Wrong" value={summary.wrong} tone="text-error-500" />
            <ResultStat label="Skipped" value={summary.skipped} tone="text-amber-400" />
            <ResultStat label="Attempted" value={summary.attempted} tone="text-primary-400" />
          </div>

          {finalResult?.xp ? (
            <div className="glass-card-light p-4 mb-4">
              <p className="text-xs text-surface-200/60 mb-1">XP Earned</p>
              <p className="text-2xl font-bold text-accent-400">+{finalResult.xp.totalXP}</p>
            </div>
          ) : null}

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

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Practice</h2>
        <p className="text-surface-200/60 mb-6">This session looks out of sync. Please start again.</p>
        <Link href="/practice" className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold">
          Back to Practice
        </Link>
      </div>
    );
  }

  const navigationPanel = (
    <QuestionNavigator
      questions={questions}
      currentIndex={currentIndex}
      answers={answers}
      skippedIds={skippedIds}
      visitedIds={visitedIds}
      onJump={goToQuestion}
    />
  );
  const askedIn = getExamLabels(current);

  return (
    <div className="min-h-dvh px-4 pt-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => router.push("/practice")}
          className="text-surface-200/60 hover:text-surface-200 transition-colors"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang((value) => (value === "both" ? "en" : value === "en" ? "ml" : "both"))}
            className="glass-card-light px-3 py-1.5 text-xs font-semibold text-surface-200/70 hover:text-surface-200 transition-all"
            aria-label="Toggle language"
          >
            {lang === "both" ? "EN+ML" : lang.toUpperCase()}
          </button>
          <span className="hidden sm:inline text-xs text-surface-200/40">{topicLabel}</span>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:gap-4">
        <div>
          <div className="glass-card p-5 mb-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-surface-200/60">
                  Question {currentIndex + 1} / {questions.length}
                </p>
                {isCurrentSkipped && !currentAnswer ? <p className="text-[11px] text-amber-300 mt-1">Skipped</p> : null}
                {askedIn.length ? (
                  <p className="text-[11px] text-surface-200/45 mt-1">
                    Asked in: <span className="text-surface-200/70">{askedIn.join(", ")}</span>
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openReport(current._id)}
                  className="text-surface-200/40 hover:text-surface-200/80 transition-colors"
                  title="Report Issue"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
                </button>
                <p className="text-xs text-surface-200/50">{timer}s</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {lang !== "ml" ? <p className="text-white font-semibold leading-relaxed">{current.text.en}</p> : null}
              {lang !== "en" && current.text.ml ? <p className="text-surface-200/80 leading-relaxed">{current.text.ml}</p> : null}
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {current.options.map((opt, index) => {
              const fallbackKey = ["A", "B", "C", "D"][index] || "A";
              const optionKey = (opt.key || fallbackKey).toUpperCase();

              let stateClass = "";
              if (result && !result.skipped) {
                if (optionKey === result.correctOption) stateClass = "correct animate-correct-pop";
                else if (optionKey === selectedOption && !result.isCorrect) stateClass = "wrong animate-wrong-shake";
              } else if (optionKey === selectedOption) {
                stateClass = "selected";
              }

              return (
                <button
                  key={`${optionKey}-${index}`}
                  type="button"
                  disabled={!!currentAnswer}
                  onClick={() => !currentAnswer && setSelectedOption(optionKey)}
                  className={`option-btn w-full p-4 text-left flex items-start gap-3 ${stateClass}`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      stateClass === "correct"
                        ? "bg-success-500/30 text-success-500"
                        : stateClass.includes("wrong")
                          ? "bg-error-500/30 text-error-500"
                          : stateClass === "selected"
                            ? "bg-primary-500/30 text-primary-400"
                            : "bg-white/5 text-surface-200/60"
                    }`}
                  >
                    {result && !result.skipped && optionKey === result.correctOption
                      ? "OK"
                      : result && !result.skipped && optionKey === selectedOption && !result.isCorrect
                        ? "X"
                        : optionKey}
                  </span>
                  <div className="flex-1">
                    {lang !== "ml" ? <p className="text-white text-sm font-medium">{opt.en}</p> : null}
                    {lang !== "en" && opt.ml ? <p className="text-surface-200/50 text-xs mt-0.5">{opt.ml}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>

          {result && !result.skipped ? (
            <div className="glass-card p-5 mb-4 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-bold ${result.isCorrect ? "text-success-500" : "text-error-500"}`}>
                  {result.isCorrect ? "Correct" : "Wrong"}
                </p>
                <p className="text-xs text-surface-200/50">
                  {summary.completed}/{summary.total} done
                </p>
              </div>
              <div className="space-y-1.5">
                {lang !== "ml" ? <p className="text-surface-200/80 text-sm">{result.explanation.en}</p> : null}
                {lang !== "en" && result.explanation.ml ? <p className="text-surface-200/70 text-sm">{result.explanation.ml}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={previousQuestion}
              className="px-3 py-2.5 rounded-xl bg-white/5 text-sm text-white font-semibold border border-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="md:hidden px-3 py-2.5 rounded-xl bg-white/5 text-sm text-white font-semibold border border-white/10"
            >
              Questions
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              className="px-3 py-2.5 rounded-xl bg-white/5 text-sm text-white font-semibold border border-white/10 disabled:opacity-40 md:col-start-3"
            >
              Next
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={!!currentAnswer || submitting}
              onClick={skipQuestion}
              className="px-5 py-3 rounded-xl bg-amber-500/10 text-amber-200 font-semibold border border-amber-400/25 disabled:opacity-40"
            >
              {isCurrentSkipped ? "Skipped" : "Skip"}
            </button>
            {summary.completed >= questions.length ? (
              <button
                type="button"
                onClick={() => void finishSession()}
                disabled={finishing}
                className="flex-1 px-6 py-3 rounded-xl gradient-primary text-white font-semibold disabled:opacity-50"
              >
                {finishing ? "Finishing..." : "Finish"}
              </button>
            ) : currentAnswer ? (
              <button
                type="button"
                onClick={nextQuestion}
                className="flex-1 px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={!selectedOption || submitting}
                onClick={submitAnswer}
                className="flex-1 px-6 py-3 rounded-xl gradient-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Checking..." : "Submit"}
              </button>
            )}
          </div>
        </div>

        <aside className="hidden md:block">{navigationPanel}</aside>
      </div>

      {navOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setNavOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[75dvh] overflow-auto rounded-t-2xl bg-surface-950 border-t border-white/10 p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Questions</p>
              <button type="button" className="text-sm text-surface-200/60" onClick={() => setNavOpen(false)}>
                Close
              </button>
            </div>
            {navigationPanel}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="glass-card-light p-3">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] text-surface-200/50">{label}</p>
    </div>
  );
}

function getExamLabels(question: QuestionData) {
  if (question.examAskedIn?.length) return question.examAskedIn.filter(Boolean);

  const tagLabels =
    question.examTags
      ?.map((tag) => {
        if (typeof tag === "string") return "";
        const name = tag.name?.trim() || "";
        const code = tag.code?.trim() || "";
        if (!name) return "";
        return code ? `${name} (${code})` : name;
      })
      .filter(Boolean) || [];

  if (tagLabels.length) return Array.from(new Set(tagLabels));

  const exam = question.exam?.trim() || "";
  const code = question.examCode?.trim() || "";
  if (exam && code) return [`${exam} (${code})`];
  return [exam || code].filter(Boolean);
}

function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  skippedIds,
  visitedIds,
  onJump,
}: {
  questions: QuestionData[];
  currentIndex: number;
  answers: Record<string, AnswerState>;
  skippedIds: Set<string>;
  visitedIds: Set<string>;
  onJump: (index: number) => void;
}) {
  return (
    <div className="glass-card-light p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white">Navigation</p>
        <p className="text-xs text-surface-200/40">{questions.length} q</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const isCurrent = index === currentIndex;
          const answered = !!answers[question._id];
          const skipped = skippedIds.has(question._id);
          const visited = visitedIds.has(question._id);
          const stateClass = isCurrent
            ? "bg-primary-500/30 text-primary-100 border-primary-300"
            : answered
              ? "bg-success-500/15 text-success-500 border-success-500/40"
              : skipped
                ? "bg-amber-500/15 text-amber-300 border-amber-400/40"
                : visited
                  ? "bg-white/10 text-surface-200 border-white/15"
                  : "bg-white/5 text-surface-200/45 border-white/10";
          return (
            <button
              key={question._id}
              type="button"
              onClick={() => onJump(index)}
              className={`aspect-square rounded-lg border text-xs font-bold transition-all ${stateClass}`}
              aria-label={`Go to question ${index + 1}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-surface-200/50">
        <LegendDot className="bg-white/5 border-white/10" label="Not visited" />
        <LegendDot className="bg-primary-500/30 border-primary-300" label="Current" />
        <LegendDot className="bg-success-500/15 border-success-500/40" label="Answered" />
        <LegendDot className="bg-amber-500/15 border-amber-400/40" label="Skipped" />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded border ${className}`} />
      <span>{label}</span>
    </div>
  );
}
