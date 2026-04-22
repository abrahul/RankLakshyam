"use client";

import { useEffect, useState, useCallback } from "react";

interface SubTopic {
  id: string;
  name: { en: string; ml: string };
}

interface TopicData {
  id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  subTopics: SubTopic[];
}

export default function SubTopicsAdminPage() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<TopicData | null>(null);
  const [newSubEn, setNewSubEn] = useState("");
  const [newSubMl, setNewSubMl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTopics = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/topics");
    const data = await res.json();
    if (data.success) {
      setTopics(data.data);
      // Refresh selected topic if open
      if (selectedTopic) {
        const updated = data.data.find((t: TopicData) => t.id === selectedTopic.id);
        if (updated) setSelectedTopic(updated);
      }
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadTopics(); }, [loadTopics]);

  const addSubTopic = async () => {
    if (!selectedTopic || !newSubEn.trim()) return;
    setError("");
    setSaving(true);

    const id = newSubEn.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const newSub: SubTopic = {
      id,
      name: { en: newSubEn.trim(), ml: newSubMl.trim() },
    };

    const updatedSubTopics = [...(selectedTopic.subTopics || []), newSub];

    const res = await fetch(`/api/admin/topics/${selectedTopic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subTopics: updatedSubTopics }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setNewSubEn("");
      setNewSubMl("");
      await loadTopics();
    } else {
      setError(data.error?.message || "Failed to save");
    }
  };

  const removeSubTopic = async (subId: string) => {
    if (!selectedTopic || !confirm("Remove this subtopic?")) return;
    setSaving(true);
    const updatedSubTopics = selectedTopic.subTopics.filter((s) => s.id !== subId);
    const res = await fetch(`/api/admin/topics/${selectedTopic.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subTopics: updatedSubTopics }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) await loadTopics();
    else setError(data.error?.message || "Failed to remove");
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Subtopics / Chapters</h2>
        <p className="text-sm text-surface-200/50">
          Manage subtopics under each topic. Questions can then be assigned to subtopics.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Topic list */}
          <div className="space-y-2">
            <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-3">Select a Topic</p>
            {topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className={`w-full text-left glass-card-light p-4 transition-all ${
                  selectedTopic?.id === topic.id
                    ? "border-primary-400/40 bg-primary-500/10"
                    : "hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{topic.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-sm">{topic.name.en}</p>
                      <p className="text-xs text-surface-200/40">{topic.name.ml}</p>
                    </div>
                  </div>
                  <span className="text-xs text-surface-200/40 bg-white/5 px-2 py-1 rounded-full">
                    {(topic.subTopics || []).length} subtopics
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Subtopic editor */}
          {selectedTopic ? (
            <div>
              <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-3">
                Subtopics — {selectedTopic.name.en}
              </p>

              {/* Existing subtopics */}
              <div className="space-y-2 mb-4">
                {(selectedTopic.subTopics || []).length === 0 ? (
                  <p className="text-sm text-surface-200/40 py-4 text-center">No subtopics yet</p>
                ) : (
                  selectedTopic.subTopics.map((st) => (
                    <div key={st.id} className="glass-card-light p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{st.name.en}</p>
                        <p className="text-xs text-surface-200/40">{st.name.ml} · ID: {st.id}</p>
                      </div>
                      <button
                        onClick={() => removeSubTopic(st.id)}
                        disabled={saving}
                        className="text-xs text-error-500/60 hover:text-error-500 transition-all disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add new subtopic */}
              <div className="glass-card-light p-4 space-y-3">
                <p className="text-xs text-surface-200/60 font-semibold">Add New Subtopic</p>
                <input
                  value={newSubEn}
                  onChange={(e) => setNewSubEn(e.target.value)}
                  placeholder="Name (English) *"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                />
                <input
                  value={newSubMl}
                  onChange={(e) => setNewSubMl(e.target.value)}
                  placeholder="പേര് (Malayalam)"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                />
                {error && <p className="text-xs text-error-500">{error}</p>}
                <button
                  onClick={addSubTopic}
                  disabled={saving || !newSubEn.trim()}
                  className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  {saving ? "Saving..." : "+ Add Subtopic"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-surface-200/30 text-sm">
              ← Select a topic to manage subtopics
            </div>
          )}
        </div>
      )}
    </div>
  );
}
