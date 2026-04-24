"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface SubTopic {
  id: string;
  name: { en: string; ml: string };
  questionCount: number;
}

interface TopicData {
  id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  questionCount: number;
  subTopics: SubTopic[];
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

function findInitialCategory(categories: CategoryRow[], targetExam: string) {
  if (!categories.length) return "all";
  const normalized = (targetExam || "").trim().toLowerCase();
  if (!normalized) return "all";

  const match =
    categories.find((category) => category.slug.toLowerCase() === normalized) ||
    categories.find((category) => category.slug.toLowerCase() === `${normalized}_level`) ||
    categories.find((category) => category.name.en.toLowerCase().includes(normalized));

  return match?._id || "all";
}

export default function PracticePage() {
  const { data: session } = useSession();
  const userExam = (session?.user as { targetExam?: string })?.targetExam || "";

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [categoryExams, setCategoryExams] = useState<ExamEntry[]>([]);

  const [examQuery, setExamQuery] = useState("");
  const [examOpen, setExamOpen] = useState(false);
  const blurCloseTimer = useRef<number | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (!data.success) return;

        const list: CategoryRow[] = data.data || [];
        setCategories(list);
        setCategoryFilter((current) => (current === "all" ? findInitialCategory(list, userExam) : current));
      } catch {
        // silent
      }
    }

    void fetchCategories();
  }, [userExam]);

  useEffect(() => {
    async function fetchTopicsAndExams() {
      setLoading(true);
      try {
        const topicUrl = categoryFilter === "all" ? "/api/topics" : `/api/topics?categoryId=${categoryFilter}`;
        const examUrl = categoryFilter === "all" ? "/api/exams" : `/api/exams?categoryId=${categoryFilter}`;
        const [topicsRes, examsRes] = await Promise.all([fetch(topicUrl), fetch(examUrl)]);
        const topicsData = await topicsRes.json();
        const examsData = await examsRes.json();

        if (topicsData.success) setTopics(topicsData.data || []);
        else setTopics([]);

        if (examsData.success) {
          const mapped: ExamEntry[] = (Array.isArray(examsData.data) ? examsData.data : []).map((raw: ExamRow) => {
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
        } else {
          setCategoryExams([]);
        }
      } catch {
        setTopics([]);
        setCategoryExams([]);
      } finally {
        setLoading(false);
      }
    }

    setSelectedExam("");
    setExamQuery("");
    setExpandedTopic(null);
    void fetchTopicsAndExams();
  }, [categoryFilter]);

  const examSuggestions = useMemo(() => {
    const query = examQuery.trim().toUpperCase();
    if (query.length < 2) return [];
    return categoryExams
      .filter((entry) => `${entry.exam} ${entry.code} ${entry.categoryName ?? ""}`.toUpperCase().includes(query))
      .slice(0, 25);
  }, [examQuery, categoryExams]);

  const practiceQuery = useMemo(() => {
    const query: Record<string, string> = {};
    if (categoryFilter !== "all") query.categoryId = categoryFilter;
    if (selectedExam) query.exam = selectedExam;
    return query;
  }, [categoryFilter, selectedExam]);

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

  const currentCategoryLabel =
    categoryFilter === "all"
      ? "All"
      : categories.find((category) => category._id === categoryFilter)?.name.en || "Selected";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-1">Practice</h1>
      <p className="text-sm text-surface-200/60 mb-4">Choose a topic to practice</p>

      <div className="mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categoryButtons.map((category) => (
              <button
                key={category.id}
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

          <div className="relative w-full">
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
              placeholder={selectedExam || "Search exam name or code (e.g., 117/21)"}
              className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none"
            />

            {(selectedExam || examQuery) && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setSelectedExam("");
                  setExamQuery("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-xs bg-white/5 text-surface-200/60 hover:bg-white/10"
                aria-label="Clear exam"
              >
                Clear
              </button>
            )}

            {examOpen && (examSuggestions.length > 0 || examQuery.trim().length >= 2) && (
              <div className="absolute z-20 mt-2 w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950/95 shadow-xl">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelectedExam("");
                    setExamQuery("");
                    setExamOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-surface-200/60 hover:bg-white/5 transition-colors"
                >
                  All exams
                </button>

                {examSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-surface-200/40">No matches</div>
                ) : (
                  <div className="max-h-72 overflow-auto">
                    {examSuggestions.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSelectedExam(entry.exam);
                          setExamQuery(entry.exam);
                          if (categoryFilter === "all" && entry.categoryId) setCategoryFilter(entry.categoryId);
                          setExamOpen(false);
                        }}
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
        </div>

        <div className="mt-2 text-[11px] text-surface-200/40">
          Showing: <span className="text-white">{currentCategoryLabel}</span>
          {selectedExam ? <span className="text-white"> {" • "} {selectedExam}</span> : null}
        </div>
      </div>

      <div className="space-y-2">
        {topics.map((topic, index) => (
          <div key={topic.id}>
            <div
              className="glass-card p-4 flex items-center gap-4 topic-card animate-fade-in cursor-pointer"
              style={{ animationDelay: `${index * 50}ms`, borderColor: `${topic.color}20` }}
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <Link
                href={{ pathname: `/practice/${topic.id}`, query: practiceQuery }}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${topic.color}20` }}
                >
                  {topic.icon}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={{ pathname: `/practice/${topic.id}`, query: practiceQuery }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <h3 className="text-white font-semibold">{topic.name.en}</h3>
                  <p className="text-xs text-surface-200/50">{topic.name.ml}</p>
                </Link>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold" style={{ color: topic.color }}>
                  {topic.questionCount}
                </p>
                <p className="text-xs text-surface-200/40">questions</p>
              </div>

              {topic.subTopics?.length > 0 && (
                <span
                  className="text-surface-200/30 text-sm transition-transform duration-200"
                  style={{ transform: expandedTopic === topic.id ? "rotate(90deg)" : "none" }}
                >
                  ›
                </span>
              )}
            </div>

            {expandedTopic === topic.id && topic.subTopics?.length > 0 && (
              <div className="ml-4 mt-1 space-y-1 animate-fade-in">
                {topic.subTopics.map((subtopic) => (
                  <Link
                    key={subtopic.id}
                    href={{
                      pathname: `/practice/${topic.id}`,
                      query: { ...practiceQuery, subTopic: subtopic.id },
                    }}
                  >
                    <div className="glass-card-light p-3 flex items-center gap-3 hover:border-white/20 transition-all">
                      <div className="w-1 h-6 rounded-full" style={{ background: topic.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{subtopic.name.en}</p>
                        {subtopic.name.ml && <p className="text-xs text-surface-200/40">{subtopic.name.ml}</p>}
                      </div>
                      <span className="text-xs text-surface-200/40">{subtopic.questionCount} q</span>
                      <span className="text-surface-200/30">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        <Link
          href={{
            pathname: "/practice/pyq",
            query: categoryFilter !== "all" ? { categoryId: categoryFilter } : {},
          }}
        >
          <div className="glass-card-light p-4 text-center topic-card transition-all hover:border-white/20">
            <span className="text-2xl block mb-2">🗂️</span>
            <p className="text-sm font-semibold text-white">Browse</p>
            <p className="text-xs text-surface-200/40">All papers</p>
          </div>
        </Link>
      </div>

      <h2 className="text-lg font-bold text-white mt-8 mb-3">Previous Year Papers</h2>
      <div className="grid grid-cols-2 gap-3">
        {categoryExams.slice(0, 3).map((entry) => (
          <Link
            key={entry.id}
            href={{
              pathname: "/practice/pyq",
              query: {
                ...(categoryFilter !== "all"
                  ? { categoryId: categoryFilter }
                  : entry.categoryId
                    ? { categoryId: entry.categoryId }
                    : {}),
                exam: entry.exam,
              },
            }}
          >
            <div
              className={`glass-card-light p-4 text-center topic-card transition-all ${
                selectedExam === entry.exam ? "border-primary-400/30" : ""
              }`}
            >
              <span className="text-2xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-white line-clamp-2">{entry.exam}</p>
              <p className="text-xs text-surface-200/40">{entry.code}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
