"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TopicRow = {
  id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  questionCount: number;
};

type SubTopicRow = {
  _id: string;
  name: { en: string; ml: string };
  topicId: string;
  sortOrder: number;
};

export default function SubTopicsAdminPage() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [subtopics, setSubtopics] = useState<SubTopicRow[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [loadingSubtopics, setLoadingSubtopics] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  const loadTopics = useCallback(async () => {
    setLoadingTopics(true);
    setError("");
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      if (data.success) {
        const list: TopicRow[] = data.data || [];
        setTopics(list);
        if (!selectedTopicId && list.length) setSelectedTopicId(list[0].id);
      } else {
        setError(data.error?.message || "Failed to load topics");
      }
    } catch {
      setError("Failed to load topics");
    } finally {
      setLoadingTopics(false);
    }
  }, [selectedTopicId]);

  const loadSubtopics = useCallback(async (topicId: string) => {
    if (!topicId) {
      setSubtopics([]);
      return;
    }
    setLoadingSubtopics(true);
    setError("");
    try {
      const params = new URLSearchParams({ topicId });
      const res = await fetch(`/api/subtopics?${params}`);
      const data = await res.json();
      if (data.success) setSubtopics(data.data || []);
      else setError(data.error?.message || "Failed to load subtopics");
    } catch {
      setError("Failed to load subtopics");
    } finally {
      setLoadingSubtopics(false);
    }
  }, []);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    void loadSubtopics(selectedTopicId);
  }, [selectedTopicId, loadSubtopics]);

  const [newSubEn, setNewSubEn] = useState("");
  const [newSubMl, setNewSubMl] = useState("");

  const addSubtopic = async () => {
    if (!selectedTopicId || !newSubEn.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/subtopics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { en: newSubEn.trim(), ml: newSubMl.trim() },
          topicId: selectedTopicId,
          sortOrder: subtopics.length,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to add subtopic");
      else {
        setNewSubEn("");
        setNewSubMl("");
        await loadSubtopics(selectedTopicId);
      }
    } catch {
      setError("Failed to add subtopic");
    } finally {
      setSaving(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editMl, setEditMl] = useState("");
  const [editSort, setEditSort] = useState<number>(0);

  const startEdit = (st: SubTopicRow) => {
    setEditingId(st._id);
    setEditEn(st.name?.en || "");
    setEditMl(st.name?.ml || "");
    setEditSort(st.sortOrder ?? 0);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/subtopics/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { en: editEn.trim(), ml: editMl.trim() },
          sortOrder: editSort,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to save subtopic");
      else if (selectedTopicId) await loadSubtopics(selectedTopicId);
      setEditingId(null);
    } catch {
      setError("Failed to save subtopic");
    } finally {
      setSaving(false);
    }
  };

  const deleteSubtopic = async (id: string) => {
    if (!confirm("Delete this subtopic?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/subtopics/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to delete subtopic");
      else if (selectedTopicId) await loadSubtopics(selectedTopicId);
    } catch {
      setError("Failed to delete subtopic");
    } finally {
      setSaving(false);
    }
  };

  const copySubtopicId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      setError("Failed to copy subtopic ID");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Subtopics / Chapters</h2>
        <p className="text-sm text-surface-200/50">
          Manage subtopics under each topic. Subtopics are stored as their own collection.
        </p>
      </div>

      {loadingTopics ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Topic list */}
          <div className="glass-card p-4">
            <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-3">
              Topics
            </p>
            <div className="space-y-2">
              {topics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopicId(t.id)}
                  className={`w-full text-left glass-card-light p-3 transition-all ${
                    selectedTopicId === t.id
                      ? "border-primary-400/40 bg-primary-500/10"
                      : "hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{t.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.name.en}</p>
                      <p className="text-xs text-surface-200/40 truncate">{t.name.ml}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subtopics */}
          <div className="glass-card p-4 lg:col-span-2">
            {!selectedTopic ? (
              <div className="text-surface-200/40 text-sm py-10 text-center">Select a topic</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">
                    Subtopics — {selectedTopic.name.en}
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadSubtopics(selectedTopicId)}
                    className="text-xs text-surface-200/50 hover:text-white transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                <div className="glass-card-light p-4 space-y-3 mb-4">
                  <p className="text-xs text-surface-200/60 font-semibold">Add New Subtopic</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={newSubEn}
                      onChange={(e) => setNewSubEn(e.target.value)}
                      placeholder="Name (EN) *"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                    <input
                      value={newSubMl}
                      onChange={(e) => setNewSubMl(e.target.value)}
                      placeholder="Name (ML)"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void addSubtopic()}
                    disabled={saving || !newSubEn.trim()}
                    className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-40 transition-all"
                  >
                    + Add Subtopic
                  </button>
                </div>

                {error && <p className="text-xs text-error-500 mb-3">{error}</p>}

                {loadingSubtopics ? (
                  <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : subtopics.length === 0 ? (
                  <p className="text-sm text-surface-200/40 text-center py-6">No subtopics yet</p>
                ) : (
                  <div className="space-y-2">
                    {subtopics
                      .slice()
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((st) => (
                        <div key={st._id} className="glass-card-light p-3">
                          {editingId === st._id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input
                                  value={editEn}
                                  onChange={(e) => setEditEn(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                                />
                                <input
                                  value={editMl}
                                  onChange={(e) => setEditMl(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                                />
                              </div>
                              <input
                                type="number"
                                value={editSort}
                                onChange={(e) => setEditSort(parseInt(e.target.value || "0", 10))}
                                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEdit()}
                                  disabled={saving || !editEn.trim()}
                                  className="px-3 py-2 rounded-xl gradient-primary text-white text-xs font-semibold disabled:opacity-40"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  disabled={saving}
                                  className="px-3 py-2 rounded-xl bg-white/5 text-surface-200/60 text-xs font-semibold border border-white/10 hover:border-white/20 disabled:opacity-40"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{st.name.en}</p>
                                <p className="text-xs text-surface-200/40 truncate">
                                  Sort: {st.sortOrder ?? 0}
                                </p>
                                <p className="text-xs text-surface-200/30 break-all mt-1">
                                  ID: {st._id}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => void copySubtopicId(st._id)}
                                  className="text-xs text-primary-300/80 hover:text-primary-300 transition-colors"
                                >
                                  Copy ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => startEdit(st)}
                                  className="text-xs text-surface-200/60 hover:text-white transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteSubtopic(st._id)}
                                  className="text-xs text-error-400/70 hover:text-error-400 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
