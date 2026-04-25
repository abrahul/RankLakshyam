"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_QUESTION_STYLE, QUESTION_STYLE_OPTIONS, type QuestionStyle } from "@/lib/question-styles";

interface QuestionRow {
  _id: string;
  text: { en: string; ml: string };
  correctOption: string;
  categoryId?: string;
  topicId: string;
  subTopic?: string;
  subtopicId?: string;
  difficulty: number;
  isVerified: boolean;
  exam?: string;
  examCode?: string;
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TopicOption {
  id: string;
  label: string;
  categoryIds: string[];
  subTopics: Array<{ id: string; name: { en: string } }>;
}

interface ExamOption {
  _id: string;
  name: string;
  code: string | null;
}

interface CategoryOption {
  _id: string;
  label: string;
}

interface RawTopicApi {
  id: string;
  name: { en: string };
  categoryId?: string | null;
  categoryIds?: string[];
  subTopics?: Array<{ id: string; name: { en: string } }>;
}

interface RawCategoryApi {
  _id: string;
  name: { en: string };
}

const selectCls =
  "px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [subTopicFilter, setSubTopicFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setTopics(
            (d.data as RawTopicApi[]).map((t) => ({
              id: t.id,
              label: t.name.en,
              categoryIds: t.categoryIds || (t.categoryId ? [t.categoryId] : []),
              subTopics: t.subTopics || [],
            }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCategories(((d.data || []) as RawCategoryApi[]).map((c) => ({ _id: c._id, label: c.name.en })));
        }
      })
      .catch(() => {});
  }, []);

  const activeSubTopics = topics.find((t) => t.id === topicFilter)?.subTopics || [];

  const fetchQuestions = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (topicFilter) params.set("topic", topicFilter);
      if (subTopicFilter) params.set("subTopic", subTopicFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (verifiedFilter) params.set("verified", verifiedFilter);
      const res = await fetch(`/api/admin/questions?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
        setMeta(data.meta);
      }
      setLoading(false);
    },
    [search, topicFilter, subTopicFilter, categoryFilter, verifiedFilter]
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchQuestions();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchQuestions]);

  const deleteQuestion = async (id: string) => {
    if (!confirm("Delete this question permanently?")) return;
    setDeleting(id);
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchQuestions(meta.page);
  };

  const toggleVerified = async (id: string, current: boolean) => {
    await fetch(`/api/admin/questions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !current }),
    });
    fetchQuestions(meta.page);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-surface-200/30 focus:border-primary-400/50 focus:outline-none transition-all"
        />
        <select
          value={topicFilter}
          onChange={(e) => {
            setTopicFilter(e.target.value);
            setSubTopicFilter("");
          }}
          style={{ colorScheme: "dark" }}
          className={selectCls}
        >
          <option value="">All Topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {topicFilter && activeSubTopics.length > 0 && (
          <select
            value={subTopicFilter}
            onChange={(e) => setSubTopicFilter(e.target.value)}
            style={{ colorScheme: "dark" }}
            className={selectCls}
          >
            <option value="">All Subtopics</option>
            {activeSubTopics.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name.en}
              </option>
            ))}
          </select>
        )}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ colorScheme: "dark" }}
          className={selectCls}
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.label}
            </option>
          ))}
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          style={{ colorScheme: "dark" }}
          className={selectCls}
        >
          <option value="">All Status</option>
          <option value="true">✅ Verified</option>
          <option value="false">⚠️ Unverified</option>
        </select>
        <button
          onClick={() => {
            setEditingId(null);
            setShowAddModal(true);
          }}
          className="px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
          + Add Question
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-surface-200/40">
        <span>
          Total: <strong className="text-white">{meta.total}</strong>
        </span>
        <span>
          Page:{" "}
          <strong className="text-white">
            {meta.page}/{meta.totalPages}
          </strong>
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl block mb-4">📭</span>
          <p className="text-surface-200/60">No questions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q._id}
              className="glass-card-light p-4 flex items-start gap-4 group hover:border-primary-400/20 transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium leading-relaxed line-clamp-2">{q.text.en}</p>
                {q.text.ml && <p className="text-xs text-surface-200/40 mt-1 line-clamp-1">{q.text.ml}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-500/20 text-primary-300">
                    {q.topicId}
                  </span>
                  {q.subTopic && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-500/10 text-primary-400/70">
                      {q.subTopic}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-surface-200/60">
                    Ans: {q.correctOption}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-surface-200/60">
                    {"⭐".repeat(q.difficulty)}
                  </span>
                  {q.exam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-500/10 text-sky-300/80">
                      {q.exam}
                    </span>
                  )}
                  {q.examCode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-surface-200/40">
                      {q.examCode}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleVerified(q._id, q.isVerified)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    q.isVerified
                      ? "bg-success-500/20 text-success-500 hover:bg-success-500/30"
                      : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                  }`}
                >
                  {q.isVerified ? "✅ Verified" : "⚠️ Unverified"}
                </button>
                <button
                  onClick={() => {
                    setEditingId(q._id);
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-surface-200/60 hover:bg-white/10 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQuestion(q._id)}
                  disabled={deleting === q._id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-error-500/10 text-error-500/60 hover:bg-error-500/20 hover:text-error-500 transition-all disabled:opacity-40"
                >
                  {deleting === q._id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => fetchQuestions(meta.page - 1)}
            disabled={meta.page <= 1}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 text-surface-200/60 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            ← Prev
          </button>
          <span className="text-sm text-surface-200/40 px-4">
            {meta.page} / {meta.totalPages}
          </span>
          <button
            onClick={() => fetchQuestions(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            className="px-4 py-2 rounded-lg text-sm bg-white/5 text-surface-200/60 hover:bg-white/10 disabled:opacity-30 transition-all"
          >
            Next →
          </button>
        </div>
      )}

      {showAddModal && (
        <QuestionModal
          editId={editingId}
          topics={topics}
          categories={categories}
          onClose={() => {
            setShowAddModal(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditingId(null);
            fetchQuestions(meta.page);
          }}
        />
      )}
    </div>
  );
}

function QuestionModal({
  editId,
  topics,
  categories,
  onClose,
  onSaved,
}: {
  editId: string | null;
  topics: TopicOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    text: { en: "", ml: "" },
    options: [
      { key: "A", en: "", ml: "" },
      { key: "B", en: "", ml: "" },
      { key: "C", en: "", ml: "" },
      { key: "D", en: "", ml: "" },
    ],
    correctOption: "A",
    explanation: { en: "", ml: "" },
    categoryId: "",
    topicId: topics[0]?.id || "",
    subTopic: "",
    tags: "",
    difficulty: 2,
    questionStyle: DEFAULT_QUESTION_STYLE as QuestionStyle,
    exam: "",
    examCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [levelExams, setLevelExams] = useState<ExamOption[]>([]);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/admin/questions/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const q = d.data;
          setForm({
            text: q.text,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation || { en: "", ml: "" },
            categoryId: q.categoryId || "",
            topicId: q.topicId,
            subTopic: q.subTopic || "",
            tags: (q.tags || []).join(", "),
            difficulty: q.difficulty || 2,
            questionStyle: q.questionStyle || DEFAULT_QUESTION_STYLE,
            exam: q.exam || "",
            examCode: q.examCode || "",
          });
        }
      })
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  useEffect(() => {
    if (!form.categoryId) return;
    fetch(`/api/exams?categoryId=${form.categoryId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLevelExams(d.data);
      })
      .catch(() => setLevelExams([]));
  }, [form.categoryId]);

  const currentTopicId = form.topicId || topics[0]?.id || "";
  const currentTopic = topics.find((t) => t.id === currentTopicId);
  const currentSubTopics = currentTopic?.subTopics || [];
  const availableCategories = categories.filter((category) => currentTopic?.categoryIds.includes(category._id));
  const effectiveCategoryId = form.categoryId || availableCategories[0]?._id || "";

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      topicId: currentTopicId,
      categoryId: effectiveCategoryId,
      subtopicId: form.subTopic,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    const url = editId ? `/api/admin/questions/${editId}` : "/api/admin/questions";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      onSaved();
    } else {
      alert(data.error?.message || "Failed to save");
    }
  };

  const updateOption = (idx: number, field: "en" | "ml", value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    }));
  };

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none";
  const selCls = `${inputCls} [&>option]:bg-slate-950 [&>option]:text-white`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="glass-card w-full max-w-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{editId ? "Edit Question" : "Add New Question"}</h3>
          <button onClick={onClose} className="text-surface-200/40 hover:text-white text-xl">
            ✕
          </button>
        </div>

        {loadingEdit ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Question (English) *</label>
              <textarea
                value={form.text.en}
                onChange={(e) => setForm((f) => ({ ...f, text: { ...f.text, en: e.target.value } }))}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Enter question in English..."
              />
            </div>
            <div>
              <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Question (Malayalam)</label>
              <textarea
                value={form.text.ml}
                onChange={(e) => setForm((f) => ({ ...f, text: { ...f.text, ml: e.target.value } }))}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="മലയാളത്തിൽ ചോദ്യം..."
              />
            </div>

            <div>
              <label className="text-xs text-surface-200/60 font-semibold mb-2 block">Options *</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, correctOption: opt.key }))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                        form.correctOption === opt.key
                          ? "bg-success-500/30 text-success-500 border border-success-500/50"
                          : "bg-white/5 text-surface-200/40 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {opt.key}
                    </button>
                    <input
                      value={opt.en}
                      onChange={(e) => updateOption(i, "en", e.target.value)}
                      placeholder={`Option ${opt.key} (English)`}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                    <input
                      value={opt.ml}
                      onChange={(e) => updateOption(i, "ml", e.target.value)}
                      placeholder="Malayalam"
                      className="w-40 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-surface-200/30 mt-1">
                Click letter to set correct answer. Current:{" "}
                <strong className="text-success-500">{form.correctOption}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Explanation (EN)</label>
                <textarea
                  value={form.explanation.en}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: { ...f.explanation, en: e.target.value } }))}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Explanation (ML)</label>
                <textarea
                  value={form.explanation.ml}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: { ...f.explanation, ml: e.target.value } }))}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Category *</label>
                <select
                  value={effectiveCategoryId}
                  onChange={(e) => {
                    setLevelExams([]);
                    setForm((f) => ({ ...f, categoryId: e.target.value, exam: "", examCode: "" }));
                  }}
                  style={{ colorScheme: "dark" }}
                  className={selCls}
                >
                  <option value="">— Select —</option>
                  {availableCategories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Exam</label>
                {levelExams.length > 0 ? (
                  <select
                    value={form.exam}
                    onChange={(e) => {
                      const ex = levelExams.find((x) => x.name === e.target.value);
                      setForm((f) => ({ ...f, exam: e.target.value, examCode: ex?.code || f.examCode }));
                    }}
                    style={{ colorScheme: "dark" }}
                    className={selCls}
                  >
                    <option value="">— Select —</option>
                    {levelExams.map((ex) => (
                      <option key={ex._id} value={ex.name}>
                        {ex.name} {ex.code ? `(${ex.code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.exam}
                    onChange={(e) => setForm((f) => ({ ...f, exam: e.target.value }))}
                    placeholder="Exam name"
                    className={inputCls}
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Exam Code</label>
                <input
                  value={form.examCode}
                  onChange={(e) => setForm((f) => ({ ...f, examCode: e.target.value }))}
                  placeholder="e.g. 117/21"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Topic *</label>
                <select
                  value={currentTopicId}
                  onChange={(e) => {
                    const nextTopic = topics.find((t) => t.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      topicId: e.target.value,
                      categoryId: nextTopic?.categoryIds[0] || "",
                      subTopic: "",
                      exam: "",
                      examCode: "",
                    }));
                    setLevelExams([]);
                  }}
                  style={{ colorScheme: "dark" }}
                  className={selCls}
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Subtopic</label>
                {currentSubTopics.length > 0 ? (
                  <select
                    value={form.subTopic}
                    onChange={(e) => setForm((f) => ({ ...f, subTopic: e.target.value }))}
                    style={{ colorScheme: "dark" }}
                    className={selCls}
                  >
                    <option value="">— None —</option>
                    {currentSubTopics.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name.en}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.subTopic}
                    onChange={(e) => setForm((f) => ({ ...f, subTopic: e.target.value }))}
                    placeholder="Subtopic id or name"
                    className={inputCls}
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: parseInt(e.target.value, 10) }))}
                  style={{ colorScheme: "dark" }}
                  className={selCls}
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {"⭐".repeat(d)} ({d})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Question Style</label>
              <select
                value={form.questionStyle}
                onChange={(e) => setForm((f) => ({ ...f, questionStyle: e.target.value as QuestionStyle }))}
                style={{ colorScheme: "dark" }}
                className={selCls}
              >
                {QUESTION_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">Tags (comma-separated)</label>
              <input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. travancore, rulers, kerala"
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 text-surface-200/60 text-sm font-medium hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.text.en || !effectiveCategoryId || form.options.some((o) => !o.en)}
                className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
