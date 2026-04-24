"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  xp?: {
    totalXP: number;
    baseXP: number;
    correctBonus: number;
    speedBonus: number;
    perfectBonus: number;
    streakBonus: number;
  };
  streak?: { currentStreak: number; longestStreak: number };
  gamification?: {
    newBadges?: Array<{ id: string; name: string; icon: string; rarity: string }>;
    milestone?: {
      title: string;
      badgeIcon: string;
      bonusXP: number;
      celebration: "toast" | "confetti" | "fullscreen";
    };
    rankUp?: {
      from: { title: { en: string }; icon: string };
      to: { title: { en: string }; icon: string; color: string };
    };
  };
}

interface CategoryRow {
  _id: string;
  slug: string;
  name: { en: string; ml: string };
  sortOrder: number;
}

type CategoryFilter = string | "all";

type ExamRow = {
  _id: string;
  name: string;
  code: string | null;
  categoryId?:
    | string
    | {
        _id?: string;
        slug?: string;
        name?: { en?: string; ml?: string };
      };
};

type ExamEntry = {
  id: string;
  exam: string;
  code: string;
  categoryId?: string;
  categoryName?: string;
};

export default function PyqPracticeClient({
  categoryId: categoryIdProp,
  exam,
  year,
}: {
  categoryId: string;
  exam: string;
  year: string;
}) {
  const router = useRouter();
  const examLabel = useMemo(() => exam || "PYQ", [exam]);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(categoryIdProp || "all");
  const [categoryExams, setCategoryExams] = useState<ExamEntry[]>([]);
  const [examQuery, setExamQuery] = useState<string>(exam);
  const [examOpen, setExamOpen] = useState(false);
  const blurCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (exam) setExamQuery(exam);
  }, [exam]);

  useEffect(() => {
    setCategoryFilter(categoryIdProp || "all");
  }, [categoryIdProp]);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setCategories(data.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchExams() {
      try {
        const url = categoryFilter === "all" ? "/api/exams" : `/api/exams?categoryId=${categoryFilter}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.success) {
          setCategoryExams([]);
          return;
        }

        const mapped: ExamEntry[] = (Array.isArray(data.data) ? data.data : []).map((raw: ExamRow) => {
          const categoryObject = typeof raw.categoryId === "object" && raw.categoryId ? raw.categoryId : undefined;
          return {
            id: raw._id,
            exam: raw.name,
            code: raw.code || "",
            categoryId: categoryObject?._id || (typeof raw.categoryId === "string" ? raw.categoryId : undefined),
            categoryName: categoryObject?.name?.en,
          };
        });
        setCategoryExams(mapped.filter((entry) => entry.exam));
      } catch {
        setCategoryExams([]);
      }
    }

    void fetchExams();
  }, [categoryFilter]);

  const categoryButtons = useMemo(
    () => [
      { id: "all" as const, label: "All" },
      ...categories
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((category) => ({ id: category._id, label: category.name.en })),
    ],
    [categories]
  );

  const examSuggestions = useMemo(() => {
    const query = examQuery.trim().toUpperCase();
    if (query.length < 2) return [];
    return categoryExams
      .filter((entry) => `${entry.exam} ${entry.code} ${entry.categoryName ?? ""}`.toUpperCase().includes(query))
      .slice(0, 30);
  }, [examQuery, categoryExams]);

  const pickExam = (picked: { categoryId?: string; exam: string }) => {
    const search = new URLSearchParams();
    if (picked.categoryId && picked.categoryId !== "all") search.set("categoryId", picked.categoryId);
    search.set("exam", picked.exam);
    if (year) search.set("year", year);
    router.push(`/practice/pyq?${search.toString()}`);
  };

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

  useEffect(() => {
    if (loading || selectedOption || showResults) return;
    const interval = setInterval(() => setTimer((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, selectedOption, showResults]);

  useEffect(() => {
    if (!exam) {
      setLoading(false);
      return;
    }

    async function loadPyqPractice() {
      try {
        const url = new URL("/api/pyq", window.location.origin);
        url.searchParams.set("exam", exam);
        url.searchParams.set("limit", "20");
        if (categoryIdProp) url.searchParams.set("categoryId", categoryIdProp);
        if (year) url.searchParams.set("year", year);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (!data.success) {
          setError(data.error?.message || "Failed to load PYQ questions");
          setLoading(false);
          return;
        }

        const loadedQuestions: QuestionData[] = data.data || [];
        if (!loadedQuestions.length) {
          setError("No PYQ questions available yet for this exam.");
          setLoading(false);
          return;
        }

        setQuestions(loadedQuestions);

        const sessionRes = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "pyq",
            questionIds: loadedQuestions.map((question) => question._id),
            context: {
              categoryId: categoryIdProp || undefined,
              exam,
              ...(year ? { pyqYear: parseInt(year, 10) } : {}),
            },
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

    void loadPyqPractice();
  }, [exam, year, categoryIdProp]);

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
        if (data.data.isComplete) setFinalResult(data.data);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [selectedOption, sessionId, submitting, questions, currentIndex, timer]);

  const nextQuestion = () => {
    if (result?.isComplete) {
      if (finalResult?.gamification?.milestone) {
        const milestone = finalResult.gamification.milestone;
        setCelebration({
          type: milestone.celebration,
          title: milestone.title,
          badgeIcon: milestone.badgeIcon || "🎉",
          bonusXP: milestone.bonusXP,
        });
      }
      setShowResults(true);
      return;
    }
    setSelectedOption(null);
    setResult(null);
    setTimer(0);
    setCurrentIndex((value) => value + 1);
  };

  if (!exam) {
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
          <span className="text-xs text-surface-200/40">Previous Year</span>
        </div>

        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-1">Previous Year Papers</h1>
        <p className="text-sm text-surface-200/60 mb-5">Pick a category and search an exam</p>

        <div className="mb-5">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryButtons.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryFilter(category.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  categoryFilter === category.id
                    ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                    : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <input
              value={examQuery}
              onChange={(event) => {
                setExamQuery(event.target.value);
                setExamOpen(true);
              }}
              onFocus={() => {
                if (blurCloseTimer.current) window.clearTimeout(blurCloseTimer.current);
                setExamOpen(true);
              }}
              onBlur={() => {
                blurCloseTimer.current = window.setTimeout(() => setExamOpen(false), 120);
              }}
              placeholder="Search exam name or code (e.g., 117/21)"
              className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none"
            />

            {examQuery && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setExamQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs bg-white/5 text-surface-200/60 hover:bg-white/10"
              >
                Clear
              </button>
            )}

            {examOpen && (examSuggestions.length > 0 || examQuery.trim().length >= 2) && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950/95 shadow-xl">
                {examSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-surface-200/40">No matches</div>
                ) : (
                  <div className="max-h-72 overflow-auto">
                    {examSuggestions.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => pickExam({ categoryId: categoryFilter !== "all" ? categoryFilter : entry.categoryId, exam: entry.exam })}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-sm text-white leading-snug">{entry.exam}</div>
                        <div className="text-[11px] text-surface-200/50">
                          {entry.code}
                          {categoryFilter === "all" && entry.categoryName ? ` • ${entry.categoryName}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {categoryExams.slice(0, 6).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => pickExam({ categoryId: categoryFilter !== "all" ? categoryFilter : entry.categoryId, exam: entry.exam })}
                className="glass-card-light p-3 text-left hover:border-white/20 transition-all"
              >
                <p className="text-sm font-semibold text-white line-clamp-2">{entry.exam}</p>
                <p className="text-xs text-surface-200/40 mt-1">{entry.code}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6">
        <div className="w-12 h-12 border-3 border-primary-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-surface-200/60">Loading PYQ practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
        <span className="text-4xl mb-4">😕</span>
        <h2 className="text-xl font-bold text-white mb-2">{examLabel} PYQ</h2>
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
          <span className="text-xs text-surface-200/40">{examLabel}</span>
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
        <p className="text-surface-200/60 mb-6">No question found.</p>
        <button
          type="button"
          onClick={() => router.push("/practice")}
          className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold"
        >
          Back to Practice
        </button>
      </div>
    );
  }

  const questionText =
    lang === "en" ? current.text.en : lang === "ml" ? current.text.ml : `${current.text.en}\n\n${current.text.ml || ""}`.trim();

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
        <div className="text-right">
          <p className="text-xs text-surface-200/40">{examLabel}</p>
          <p className="text-[10px] text-surface-200/30">
            Q {currentIndex + 1} / {questions.length}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { id: "both", label: "EN+ML" },
          { id: "en", label: "EN" },
          { id: "ml", label: "ML" },
        ].map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setLang(entry.id as "en" | "ml" | "both")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              lang === entry.id
                ? "bg-white/10 text-white border border-white/15"
                : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-5 mb-4">
        <p className="text-sm text-white whitespace-pre-line leading-relaxed">{questionText}</p>

        <div className="mt-4 space-y-2">
          {current.options.map((option) => {
            const key = option.key;
            const isSelected = selectedOption === key;
            const isCorrect = result && key === result.correctOption;
            const isWrong = result && isSelected && !result.isCorrect;

            const base = "w-full text-left p-4 rounded-xl border transition-all option-btn";
            const className = result
              ? isCorrect
                ? `${base} bg-success-500/20 border-success-500/50 text-success-200`
                : isWrong
                  ? `${base} bg-error-500/15 border-error-500/40 text-error-200`
                  : `${base} bg-white/5 border-white/10 text-surface-200/70`
              : isSelected
                ? `${base} bg-primary-500/20 border-primary-400/40 text-white`
                : `${base} bg-white/5 border-white/10 text-surface-200/70 hover:border-white/20`;

            const optionText =
              lang === "en" ? option.en : lang === "ml" ? option.ml : `${option.en}\n${option.ml || ""}`.trim();

            return (
              <button
                key={key}
                type="button"
                disabled={!!result}
                onClick={() => setSelectedOption(key)}
                className={className}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {key}
                  </span>
                  <span className="text-sm whitespace-pre-line leading-relaxed">{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!selectedOption || submitting || !!result}
          onClick={() => void submitAnswer()}
          className="flex-1 px-5 py-3 rounded-xl gradient-primary text-white font-semibold disabled:opacity-40"
        >
          {submitting ? "Submitting..." : result ? "Submitted" : "Submit"}
        </button>
        <button
          type="button"
          disabled={!result}
          onClick={nextQuestion}
          className="px-5 py-3 rounded-xl bg-white/5 text-white font-semibold border border-white/10 hover:border-white/20 disabled:opacity-40"
        >
          {result?.isComplete ? "Finish" : "Next"}
        </button>
      </div>

      {result && (
        <div className="glass-card-light p-4 mt-4">
          <p className={`text-sm font-semibold ${result.isCorrect ? "text-success-400" : "text-error-400"}`}>
            {result.isCorrect ? "Correct" : "Wrong"}
          </p>
          <p className="text-xs text-surface-200/50 mt-1">Correct option: {result.correctOption}</p>
          {result.explanation?.en ? (
            <p className="text-sm text-surface-200/70 mt-3 whitespace-pre-line">{result.explanation.en}</p>
          ) : null}
        </div>
      )}

      <div className="mt-4 text-xs text-surface-200/40">
        Time: {timer}s
        {year ? ` • Year: ${year}` : ""}
      </div>
    </div>
  );
}
