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

type PscLevel = "10th_level" | "plus2_level" | "degree_level" | "other_exams";
type CategoryId = PscLevel | "all";
type PscExamEntry = { exam: string; code: string; level?: PscLevel };

const CATEGORIES: Array<{ id: CategoryId; label: string }> = [
  { id: "all", label: "All" },
  { id: "10th_level", label: "10th" },
  { id: "plus2_level", label: "12th" },
  { id: "degree_level", label: "Degree" },
  { id: "other_exams", label: "Others" },
];

function mapTargetExamToLevel(targetExam: string): CategoryId {
  const t = (targetExam || "").toLowerCase();
  if (t === "degree" || t === "degree_level") return "degree_level";
  if (t === "plus2" || t === "plus2_level") return "plus2_level";
  if (t === "other_exams") return "other_exams";
  return "10th_level";
}

export default function PracticePage() {
  const { data: session } = useSession();
  const userExam = (session?.user as { targetExam?: string })?.targetExam || "";

  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

  const [pscLevel, setPscLevel] = useState<CategoryId>(() => mapTargetExamToLevel(userExam));
  const [pscExam, setPscExam] = useState<string>("");
  const [levelExams, setLevelExams] = useState<PscExamEntry[]>([]);

  const [examQuery, setExamQuery] = useState("");
  const [examOpen, setExamOpen] = useState(false);
  const blurCloseTimer = useRef<number | null>(null);

  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    setPscLevel(mapTargetExamToLevel(userExam));
  }, [userExam]);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/topics");
        const data = await res.json();
        if (data.success) setTopics(data.data);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  useEffect(() => {
    async function fetchExams() {
      try {
        const url = pscLevel === "all" ? "/api/psc/exams" : `/api/psc/exams?level=${pscLevel}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
          setLevelExams([]);
          return;
        }

        if (pscLevel !== "all" && data.data?.exams) {
          setLevelExams(data.data.exams);
          return;
        }

        const idx = data.data as Partial<Record<PscLevel, Array<{ exam: string; code: string }>>>;
        const flattened: PscExamEntry[] = [];
        (["10th_level", "plus2_level", "degree_level", "other_exams"] as PscLevel[]).forEach((lvl) => {
          (idx?.[lvl] ?? []).forEach((e) => flattened.push({ ...e, level: lvl }));
        });
        setLevelExams(flattened);
      } catch {
        setLevelExams([]);
      }
    }

    setPscExam("");
    setExamQuery("");
    fetchExams();
  }, [pscLevel]);

  const examSuggestions = useMemo(() => {
    const q = examQuery.trim().toUpperCase();
    if (q.length < 2) return [];
    const matches = levelExams.filter((e) => `${e.exam} ${e.code} ${e.level ?? ""}`.toUpperCase().includes(q));
    return matches.slice(0, 25);
  }, [examQuery, levelExams]);

  const practiceQuery = useMemo(() => {
    const q: Record<string, string> = {};
    if (pscLevel !== "all") q.level = pscLevel;
    if (pscExam) q.exam = pscExam;
    return q;
  }, [pscLevel, pscExam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-1">
        Practice
      </h1>
      <p className="text-sm text-surface-200/60 mb-4">Choose a topic to practice</p>

      {/* Level filter + exam search */}
      <div className="mb-5">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setPscLevel(c.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  pscLevel === c.id
                    ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                    : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full">
            <input
              value={examQuery}
              onChange={(e) => {
                setExamQuery(e.target.value);
                setExamOpen(true);
              }}
              onFocus={() => {
                if (blurCloseTimer.current) window.clearTimeout(blurCloseTimer.current);
                setExamOpen(true);
              }}
              onBlur={() => {
                blurCloseTimer.current = window.setTimeout(() => setExamOpen(false), 120);
              }}
              placeholder={pscExam ? pscExam : "Search exam name or code (e.g., 117/21)"}
              className="w-full px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none"
            />

            {(pscExam || examQuery) && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setPscExam("");
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPscExam("");
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
                    {examSuggestions.map((ex) => (
                      <button
                        key={`${ex.level ?? "x"}-${ex.code}-${ex.exam}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPscExam(ex.exam);
                          setExamQuery(ex.exam);
                          setExamOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-sm text-white leading-snug">{ex.exam}</div>
                        <div className="text-[11px] text-surface-200/50">
                          {ex.code}
                          {pscLevel === "all" && ex.level ? ` • ${ex.level.replaceAll("_", " ")}` : ""}
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
          Showing: <span className="text-white">{pscLevel.replaceAll("_", " ")}</span>
          {pscExam ? <span className="text-white"> {" • "} {pscExam}</span> : null}
        </div>
      </div>

      {/* Topics + subtopics */}
      <div className="space-y-2">
        {topics.map((topic, i) => (
          <div key={topic.id}>
            <div
              className="glass-card p-4 flex items-center gap-4 topic-card animate-fade-in cursor-pointer"
              style={{ animationDelay: `${i * 50}ms`, borderColor: `${topic.color}20` }}
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <Link
                href={{ pathname: `/practice/${topic.id}`, query: practiceQuery }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${topic.color}20` }}
                >
                  {topic.icon}
                </div>
              </Link>

              <div className="flex-1 min-w-0" onClick={() => {}}>
                <Link
                  href={{ pathname: `/practice/${topic.id}`, query: practiceQuery }}
                  onClick={(e) => e.stopPropagation()}
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
                {topic.subTopics.map((st) => (
                  <Link
                    key={st.id}
                    href={{
                      pathname: `/practice/${topic.id}`,
                      query: { ...practiceQuery, subTopic: st.id },
                    }}
                  >
                    <div className="glass-card-light p-3 flex items-center gap-3 hover:border-white/20 transition-all">
                      <div className="w-1 h-6 rounded-full" style={{ background: topic.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium">{st.name.en}</p>
                        {st.name.ml && <p className="text-xs text-surface-200/40">{st.name.ml}</p>}
                      </div>
                      <span className="text-xs text-surface-200/40">{st.questionCount} q</span>
                      <span className="text-surface-200/30">›</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Previous Year Papers — now uses Level hierarchy */}
      <h2 className="text-lg font-bold text-white mt-8 mb-3">Previous Year Papers</h2>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
          <Link key={cat.id} href={`/practice/pyq?level=${cat.id}`}>
            <div
              className={`glass-card-light p-4 text-center topic-card transition-all ${
                pscLevel === cat.id ? "border-primary-400/30" : ""
              }`}
            >
              <span className="text-2xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-white">{cat.label}</p>
              <p className="text-xs text-surface-200/40">Previous years</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
