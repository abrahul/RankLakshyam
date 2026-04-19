"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TopicData {
  id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  questionCount: number;
}

export default function PracticePage() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

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
      <p className="text-sm text-surface-200/60 mb-6">Choose a topic to practice</p>

      <div className="space-y-3">
        {topics.map((topic, i) => (
          <Link key={topic.id} href={`/practice/${topic.id}`}>
            <div
              className="glass-card p-4 flex items-center gap-4 topic-card animate-fade-in"
              style={{ animationDelay: `${i * 50}ms`, borderColor: `${topic.color}20` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${topic.color}20` }}
              >
                {topic.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold">{topic.name.en}</h3>
                <p className="text-xs text-surface-200/50">{topic.name.ml}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: topic.color }}>
                  {topic.questionCount}
                </p>
                <p className="text-xs text-surface-200/40">questions</p>
              </div>
              <span className="text-surface-200/30">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Previous Year Papers */}
      <h2 className="text-lg font-bold text-white mt-8 mb-3">Previous Year Papers</h2>
      <div className="grid grid-cols-2 gap-3">
        {["LDC", "LGS", "Degree Level", "Police"].map((exam) => (
          <Link key={exam} href={`/practice/pyq?exam=${exam.toLowerCase().replace(" ", "_")}`}>
            <div className="glass-card-light p-4 text-center topic-card">
              <span className="text-2xl block mb-2">📋</span>
              <p className="text-sm font-semibold text-white">{exam}</p>
              <p className="text-xs text-surface-200/40">Previous years</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
