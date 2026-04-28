"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

export default function PracticePage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedSubtopicId, setSelectedSubtopicId] = useState("");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data.success ? data.data || [] : []);
      } catch {
        setCategories([]);
      }
    }

    void fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchTopics() {
      setLoading(true);
      try {
        const topicUrl = categoryFilter === "all" ? "/api/topics" : `/api/topics?categoryId=${categoryFilter}`;
        const topicsRes = await fetch(topicUrl);
        const topicsData = await topicsRes.json();
        setTopics(topicsData.success ? topicsData.data || [] : []);
      } catch {
        setTopics([]);
      } finally {
        setLoading(false);
      }
    }

    setSelectedTopicId("");
    setSelectedSubtopicId("");
    void fetchTopics();
  }, [categoryFilter]);

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [categories]
  );

  const categoryButtons = useMemo(
    () => [
      { id: "all" as const, label: "All subjects" },
      ...sortedCategories.map((category) => ({ id: category._id, label: category.name.en })),
    ],
    [sortedCategories]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category._id === categoryFilter),
    [categories, categoryFilter]
  );

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId),
    [topics, selectedTopicId]
  );

  const selectedSubtopic = useMemo(
    () => selectedTopic?.subTopics?.find((subtopic) => subtopic.id === selectedSubtopicId),
    [selectedSubtopicId, selectedTopic]
  );

  const basePracticeQuery = useMemo(() => {
    const query: Record<string, string> = { all: "1" };
    if (categoryFilter !== "all") query.categoryId = categoryFilter;
    return query;
  }, [categoryFilter]);

  const practiceHref = (topicId: string, subtopicId?: string) => ({
    pathname: `/practice/${topicId}`,
    query: subtopicId ? { ...basePracticeQuery, subTopic: subtopicId } : basePracticeQuery,
  });

  const selectedPath = [
    selectedCategory?.name.en || (categoryFilter === "all" ? "All subjects" : "Subject"),
    selectedTopic?.name.en || "Topic",
    selectedSubtopic?.name.en || (selectedTopic ? "All chapters" : "Subtopic"),
  ];

  const resetSelection = () => {
    setCategoryFilter("all");
    setSelectedTopicId("");
    setSelectedSubtopicId("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24 animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white font-[family-name:var(--font-display)] mb-1">Practice</h1>
        <p className="text-sm text-surface-200/60">Choose a subject, topic, and chapter.</p>
      </div>

      <div className="glass-card-light p-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-surface-200/50 mb-1">Selected path</p>
            <p className="text-sm text-white leading-relaxed">{selectedPath.join(" > ")}</p>
          </div>
          <button
            type="button"
            onClick={resetSelection}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-white/5 text-xs font-semibold text-surface-200/70 border border-white/10 hover:border-white/20"
          >
            Clear
          </button>
        </div>

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
      </div>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Topic</h2>
          <span className="text-xs text-surface-200/40">{topics.length} available</span>
        </div>

        {topics.length === 0 ? (
          <div className="glass-card-light p-5 text-center">
            <p className="text-sm text-surface-200/60">No practice topics found for this subject.</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {topics.map((topic) => {
              const isSelected = topic.id === selectedTopicId;
              const content = (
                <>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${topic.color}20` }}
                  >
                    {topic.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{topic.name.en}</h3>
                    {topic.name.ml ? <p className="text-xs text-surface-200/50 truncate">{topic.name.ml}</p> : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: topic.color }}>
                      {topic.questionCount}
                    </p>
                    <p className="text-xs text-surface-200/40">q</p>
                  </div>
                </>
              );

              const className = `option-btn topic-card p-4 flex items-center gap-4 text-left ${
                isSelected ? "selected" : ""
              }`;

              if (!topic.subTopics?.length) {
                return (
                  <Link
                    key={topic.id}
                    href={practiceHref(topic.id)}
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      setSelectedSubtopicId("");
                    }}
                    className={className}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopicId(topic.id);
                    setSelectedSubtopicId("");
                  }}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white">Subtopic / Chapter</h2>
          {selectedTopic ? (
            <span className="text-xs text-surface-200/40">{selectedTopic.subTopics?.length || 0} chapters</span>
          ) : null}
        </div>

        {!selectedTopic ? (
          <div className="glass-card-light p-5 text-center">
            <p className="text-sm text-surface-200/60">Select a topic to see chapters.</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            <Link
              href={practiceHref(selectedTopic.id)}
              onClick={() => setSelectedSubtopicId("all")}
              className={`option-btn p-4 flex items-center justify-between gap-3 text-left ${
                selectedSubtopicId === "all" ? "selected" : ""
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-white">All chapters</p>
                <p className="text-xs text-surface-200/50">Full topic</p>
              </div>
              <span className="text-xs text-surface-200/40">{selectedTopic.questionCount} q</span>
            </Link>

            {selectedTopic.subTopics?.length ? (
              selectedTopic.subTopics.map((subtopic) => (
                <Link
                  key={subtopic.id}
                  href={practiceHref(selectedTopic.id, subtopic.id)}
                  onClick={() => setSelectedSubtopicId(subtopic.id)}
                  className={`option-btn p-4 flex items-center justify-between gap-3 text-left ${
                    selectedSubtopicId === subtopic.id ? "selected" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{subtopic.name.en}</p>
                    {subtopic.name.ml ? (
                      <p className="text-xs text-surface-200/50 truncate">{subtopic.name.ml}</p>
                    ) : null}
                  </div>
                  <span className="text-xs text-surface-200/40 flex-shrink-0">{subtopic.questionCount} q</span>
                </Link>
              ))
            ) : (
              <div className="glass-card-light p-4">
                <p className="text-sm text-surface-200/60">No chapters are mapped yet.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
