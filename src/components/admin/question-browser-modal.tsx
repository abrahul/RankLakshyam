"use client";

import { useEffect, useMemo, useState } from "react";

type BrowserQuestion = {
  _id: string;
  text: { en?: string; ml?: string };
  options?: Array<{ key?: string; en?: string; ml?: string }>;
  correctOption?: string;
  explanation?: { en?: string; ml?: string };
  topicId: string;
  subTopic?: string;
  subtopicId?: string;
  difficulty?: number;
  isVerified?: boolean;
  exam?: string;
  examCode?: string;
  createdAt?: string;
};

type SubtopicOption = {
  _id: string;
  name: { en?: string; ml?: string };
};

type QuestionBrowserModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  topicId: string;
  subtopicId?: string;
};

export default function QuestionBrowserModal({
  open,
  onClose,
  title,
  topicId,
  subtopicId,
}: QuestionBrowserModalProps) {
  const [questions, setQuestions] = useState<BrowserQuestion[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicOption[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("createdAt_desc");
  const [subtopicFilter, setSubtopicFilter] = useState(subtopicId || "");

  useEffect(() => {
    if (!open) return;
    setSubtopicFilter(subtopicId || "");
  }, [open, subtopicId]);

  useEffect(() => {
    if (!open || !topicId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [questionsRes, subtopicsRes] = await Promise.all([
          fetch(
            `/api/admin/questions?${new URLSearchParams({
              topic: topicId,
              limit: "200",
              ...(subtopicFilter ? { subTopic: subtopicFilter } : {}),
              ...(sort ? { sort } : {}),
            })}`
          ),
          subtopicId ? Promise.resolve(null) : fetch(`/api/subtopics?${new URLSearchParams({ topicId })}`),
        ]);

        const questionsData = await questionsRes.json();
        if (!questionsData.success) {
          if (!cancelled) {
            setQuestions([]);
            setError(questionsData.error?.message || "Failed to load questions");
          }
          return;
        }

        const nextQuestions: BrowserQuestion[] = questionsData.data || [];
        if (!cancelled) {
          setQuestions(nextQuestions);
          setActiveQuestionId((current) =>
            nextQuestions.some((question) => question._id === current) ? current : nextQuestions[0]?._id || ""
          );
        }

        if (!subtopicId && subtopicsRes) {
          const subtopicsData = await subtopicsRes.json();
          if (!cancelled) setSubtopics(subtopicsData.success ? (subtopicsData.data || []) : []);
        } else if (!cancelled) {
          setSubtopics([]);
        }
      } catch {
        if (!cancelled) {
          setQuestions([]);
          setError("Failed to load questions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [open, topicId, subtopicId, subtopicFilter, sort]);

  const activeQuestion = useMemo(
    () => questions.find((question) => question._id === activeQuestionId) || questions[0] || null,
    [questions, activeQuestionId]
  );

  const activeIndex = activeQuestion ? questions.findIndex((question) => question._id === activeQuestion._id) : -1;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto bg-slate-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="glass-card w-full max-w-7xl p-5 animate-slide-up" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white">Question Browser</h3>
            <p className="text-sm text-surface-200/60 mt-1">{title}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              style={{ colorScheme: "dark" }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none [&>option]:bg-slate-950 [&>option]:text-white"
            >
              <option value="createdAt_desc">Newest Added</option>
              <option value="createdAt_asc">Oldest Added</option>
            </select>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-surface-200/60 text-sm hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>

        {!subtopicId && subtopics.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSubtopicFilter("")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !subtopicFilter
                  ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                  : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
              }`}
            >
              All Subtopics
            </button>
            {subtopics.map((subtopic) => (
              <button
                key={subtopic._id}
                type="button"
                onClick={() => setSubtopicFilter(subtopic._id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  subtopicFilter === subtopic._id
                    ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                    : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
                }`}
              >
                {subtopic.name?.en || subtopic._id}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 min-h-[65vh]">
          <div className="glass-card-light p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">Questions</p>
              <span className="text-xs text-surface-200/40">{questions.length}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-error-500 py-6 text-center">{error}</p>
            ) : questions.length === 0 ? (
              <p className="text-sm text-surface-200/40 py-6 text-center">No questions found for this scope</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {questions.map((question, index) => (
                  <button
                    key={question._id}
                    type="button"
                    onClick={() => setActiveQuestionId(question._id)}
                    className={`w-full text-left rounded-2xl p-3 transition-all border ${
                      activeQuestion?._id === question._id
                        ? "bg-primary-500/10 border-primary-400/40"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-surface-200/40">#{index + 1}</span>
                      <span className={`text-[10px] ${question.isVerified ? "text-success-400" : "text-amber-400"}`}>
                        {question.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium mt-1 line-clamp-3">
                      {question.text?.en || "Untitled question"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card-light p-5">
            {!activeQuestion ? (
              <div className="h-full flex items-center justify-center text-surface-200/40 text-sm">
                Select a question to inspect it here
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-500/20 text-primary-300">
                      {activeQuestion.topicId}
                    </span>
                    {activeQuestion.subTopic ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-surface-200/60">
                        {activeQuestion.subTopic}
                      </span>
                    ) : null}
                    {activeQuestion.examCode ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-surface-200/60">
                        {activeQuestion.examCode}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => activeIndex > 0 && setActiveQuestionId(questions[activeIndex - 1]._id)}
                      disabled={activeIndex <= 0}
                      className="px-3 py-2 rounded-xl bg-white/5 text-surface-200/60 text-sm hover:bg-white/10 disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => activeIndex >= 0 && activeIndex < questions.length - 1 && setActiveQuestionId(questions[activeIndex + 1]._id)}
                      disabled={activeIndex < 0 || activeIndex >= questions.length - 1}
                      className="px-3 py-2 rounded-xl bg-white/5 text-surface-200/60 text-sm hover:bg-white/10 disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="space-y-5 overflow-y-auto pr-1">
                  <div>
                    <p className="text-sm text-white font-semibold leading-relaxed">{activeQuestion.text?.en}</p>
                    {activeQuestion.text?.ml ? (
                      <p className="text-sm text-surface-200/65 leading-relaxed mt-2">{activeQuestion.text.ml}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    {(activeQuestion.options || []).map((option, index) => {
                      const key = option.key || ["A", "B", "C", "D"][index] || "A";
                      const isCorrect = key === activeQuestion.correctOption;
                      return (
                        <div key={`${key}-${index}`} className={`rounded-2xl p-3 border ${isCorrect ? "bg-success-500/10 border-success-500/30" : "bg-white/5 border-white/10"}`}>
                          <div className="flex items-start gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isCorrect ? "bg-success-500/20 text-success-400" : "bg-white/10 text-surface-200/60"}`}>
                              {key}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-white">{option.en}</p>
                              {option.ml ? <p className="text-xs text-surface-200/50 mt-1">{option.ml}</p> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass-card p-4">
                      <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-2">Answer</p>
                      <p className="text-lg text-success-400 font-bold">{activeQuestion.correctOption || "-"}</p>
                    </div>
                    <div className="glass-card p-4">
                      <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-2">Added</p>
                      <p className="text-sm text-white">{activeQuestion.createdAt ? new Date(activeQuestion.createdAt).toLocaleString() : "-"}</p>
                    </div>
                  </div>

                  {activeQuestion.explanation?.en || activeQuestion.explanation?.ml ? (
                    <div className="glass-card p-4">
                      <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-2">Explanation</p>
                      {activeQuestion.explanation?.en ? <p className="text-sm text-white leading-relaxed">{activeQuestion.explanation.en}</p> : null}
                      {activeQuestion.explanation?.ml ? <p className="text-sm text-surface-200/65 leading-relaxed mt-2">{activeQuestion.explanation.ml}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
