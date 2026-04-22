"use client";

import { useEffect, useState } from "react";
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
  examTags: string[];
}

const EXAMS = [
  { id: "", label: "All Exams" },
  { id: "ldc", label: "LDC" },
  { id: "lgs", label: "LGS" },
  { id: "degree", label: "Degree Level" },
  { id: "police", label: "Police" },
];

export default function PracticePage() {
  const { data: session } = useSession();
  const userExam = (session?.user as { targetExam?: string })?.targetExam || "";

  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState(userExam);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    setExamFilter(userExam);
  }, [userExam]);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch("/api/topics");
        const data = await res.json();
        if (data.success) setTopics(data.data);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetchTopics();
  }, []);

  const filteredTopics = examFilter
    ? topics.filter((t) => !t.examTags?.length || t.examTags.includes(examFilter))
    : topics;

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

      {/* Exam filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {EXAMS.map((e) => (
          <button
            key={e.id}
            onClick={() => setExamFilter(e.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              examFilter === e.id
                ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Topics + subtopics */}
      <div className="space-y-2">
        {filteredTopics.map((topic, i) => (
          <div key={topic.id}>
            {/* Topic row */}
            <div
              className="glass-card p-4 flex items-center gap-4 topic-card animate-fade-in cursor-pointer"
              style={{ animationDelay: `${i * 50}ms`, borderColor: `${topic.color}20` }}
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
            >
              <Link
                href={`/practice/${topic.id}${examFilter ? `?exam=${examFilter}` : ""}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ background: `${topic.color}20` }}
                >
                  {topic.icon}
                </div>
              </Link>
              <div className="flex-1" onClick={() => {}}>
                <Link href={`/practice/${topic.id}${examFilter ? `?exam=${examFilter}` : ""}`} onClick={(e) => e.stopPropagation()}>
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
                <span className="text-surface-200/30 text-sm transition-transform duration-200"
                  style={{ transform: expandedTopic === topic.id ? "rotate(90deg)" : "none" }}>
                  ›
                </span>
              )}
            </div>

            {/* Subtopics — expand inline */}
            {expandedTopic === topic.id && topic.subTopics?.length > 0 && (
              <div className="ml-4 mt-1 space-y-1 animate-fade-in">
                {topic.subTopics.map((st) => (
                  <Link
                    key={st.id}
                    href={`/practice/${topic.id}?subTopic=${st.id}${examFilter ? `&exam=${examFilter}` : ""}`}
                  >
                    <div className="glass-card-light p-3 flex items-center gap-3 hover:border-white/20 transition-all">
                      <div className="w-1 h-6 rounded-full" style={{ background: topic.color }} />
                      <div className="flex-1">
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

      {/* Previous Year Papers */}
      <h2 className="text-lg font-bold text-white mt-8 mb-3">Previous Year Papers</h2>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: "ldc", label: "LDC" },
          { id: "lgs", label: "LGS" },
          { id: "degree", label: "Degree Level" },
          { id: "police", label: "Police" },
        ].map((exam) => (
          <Link key={exam.id} href={`/practice/pyq?exam=${exam.id}`}>
            <div className={`glass-card-light p-4 text-center topic-card transition-all ${
              examFilter === exam.id ? "border-primary-400/30" : ""
            }`}>
              <span className="text-2xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-white">{exam.label}</p>
              <p className="text-xs text-surface-200/40">Previous years</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
