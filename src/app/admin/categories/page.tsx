"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LevelName = "10th_level" | "plus2_level" | "degree_level" | "other_exams";

type LevelRow = {
  _id: string;
  name: LevelName;
  displayName: { en: string; ml?: string };
  sortOrder: number;
};

type ExamRow = {
  _id: string;
  name: string;
  code: string | null;
  note?: string;
  levelId:
    | string
    | {
        _id: string;
        name: LevelName;
        displayName?: { en?: string; ml?: string };
      };
};

function shortLevelLabel(level: LevelName) {
  if (level === "10th_level") return "10th";
  if (level === "plus2_level") return "12th";
  if (level === "degree_level") return "Degree";
  return "Others";
}

export default function CategoriesAdminPage() {
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedLevel = useMemo(() => levels.find((l) => l._id === selectedLevelId) || null, [levels, selectedLevelId]);

  const loadLevels = useCallback(async () => {
    setLoadingLevels(true);
    setError("");
    try {
      const res = await fetch("/api/levels");
      const data = await res.json();
      if (data.success) {
        const list: LevelRow[] = data.data || [];
        setLevels(list);
        if (!selectedLevelId && list.length) setSelectedLevelId(list[0]._id);
      } else {
        setError(data.error?.message || "Failed to load categories");
      }
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoadingLevels(false);
    }
  }, [selectedLevelId]);

  const loadExams = useCallback(async (levelId: string) => {
    if (!levelId) {
      setExams([]);
      return;
    }
    setLoadingExams(true);
    setError("");
    try {
      const params = new URLSearchParams({ levelId });
      const res = await fetch(`/api/exams?${params}`);
      const data = await res.json();
      if (data.success) setExams(data.data || []);
      else setError(data.error?.message || "Failed to load exams");
    } catch {
      setError("Failed to load exams");
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    void loadLevels();
  }, [loadLevels]);

  useEffect(() => {
    void loadExams(selectedLevelId);
  }, [selectedLevelId, loadExams]);

  // Level edit form
  const [levelEn, setLevelEn] = useState("");
  const [levelMl, setLevelMl] = useState("");
  const [levelSort, setLevelSort] = useState<number>(0);

  useEffect(() => {
    if (!selectedLevel) return;
    setLevelEn(selectedLevel.displayName?.en || "");
    setLevelMl(selectedLevel.displayName?.ml || "");
    setLevelSort(selectedLevel.sortOrder ?? 0);
  }, [selectedLevel?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLevel = async () => {
    if (!selectedLevel) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/levels/${selectedLevel._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: { en: levelEn.trim(), ml: levelMl.trim() },
          sortOrder: levelSort,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to save category");
      } else {
        await loadLevels();
      }
    } catch {
      setError("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const deleteLevel = async () => {
    if (!selectedLevel) return;
    if (!confirm(`Delete category "${selectedLevel.displayName?.en || selectedLevel.name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/levels/${selectedLevel._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to delete category");
      } else {
        setSelectedLevelId("");
        setExams([]);
        await loadLevels();
      }
    } catch {
      setError("Failed to delete category");
    } finally {
      setSaving(false);
    }
  };

  // Exam editor
  const [newExamName, setNewExamName] = useState("");
  const [newExamCode, setNewExamCode] = useState("");
  const [newExamNote, setNewExamNote] = useState("");

  const addExam = async () => {
    if (!selectedLevel) return;
    if (!newExamName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExamName.trim(),
          code: newExamCode.trim() || null,
          levelId: selectedLevel._id,
          note: newExamNote.trim() || "",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to add exam");
        return;
      }
      setNewExamName("");
      setNewExamCode("");
      setNewExamNote("");
      await loadExams(selectedLevel._id);
    } catch {
      setError("Failed to add exam");
    } finally {
      setSaving(false);
    }
  };

  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamName, setEditExamName] = useState("");
  const [editExamCode, setEditExamCode] = useState("");
  const [editExamNote, setEditExamNote] = useState("");

  const startEdit = (e: ExamRow) => {
    setEditingExamId(e._id);
    setEditExamName(e.name || "");
    setEditExamCode(e.code || "");
    setEditExamNote(e.note || "");
  };

  const saveExam = async () => {
    if (!editingExamId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/exams/${editingExamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editExamName.trim(),
          code: editExamCode.trim() || null,
          note: editExamNote.trim() || "",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to save exam");
      } else if (selectedLevel) {
        setEditingExamId(null);
        await loadExams(selectedLevel._id);
      }
    } catch {
      setError("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (id: string) => {
    if (!selectedLevel) return;
    if (!confirm("Delete this exam?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to delete exam");
      } else {
        await loadExams(selectedLevel._id);
      }
    } catch {
      setError("Failed to delete exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Categories & Exams</h2>
        <p className="text-sm text-surface-200/50">
          Manage the 4 core categories and their exam lists. These are used in filters and PYQ selection.
        </p>
      </div>

      {loadingLevels ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Levels */}
          <div className="space-y-3">
            <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">Categories</p>
            <div className="space-y-2">
              {levels.map((l) => (
                <button
                  key={l._id}
                  onClick={() => setSelectedLevelId(l._id)}
                  className={`w-full text-left glass-card-light p-4 transition-all ${
                    selectedLevelId === l._id ? "border-primary-400/40 bg-primary-500/10" : "hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{shortLevelLabel(l.name)}</p>
                      <p className="text-xs text-surface-200/40 truncate">{l.displayName?.en}</p>
                    </div>
                    <span className="text-[10px] text-surface-200/40 bg-white/5 px-2 py-1 rounded-full">
                      Sort {l.sortOrder ?? 0}
                    </span>
                  </div>
                </button>
              ))}
              {levels.length === 0 ? (
                <p className="text-sm text-surface-200/40 py-4 text-center">No categories found</p>
              ) : null}
            </div>

            {selectedLevel ? (
              <div className="glass-card p-4">
                <p className="text-xs text-surface-200/60 font-semibold mb-3">Edit Category</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-surface-200/40 block mb-1">Display name (EN)</label>
                    <input
                      value={levelEn}
                      onChange={(e) => setLevelEn(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-surface-200/40 block mb-1">Display name (ML)</label>
                    <input
                      value={levelMl}
                      onChange={(e) => setLevelMl(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-[11px] text-surface-200/40 block mb-1">Sort order</label>
                  <input
                    type="number"
                    value={levelSort}
                    onChange={(e) => setLevelSort(parseInt(e.target.value || "0", 10))}
                    className="w-32 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                  />
                </div>

                {error ? <p className="text-xs text-error-500 mt-3">{error}</p> : null}

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => void saveLevel()}
                    disabled={saving || !levelEn.trim()}
                    className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteLevel()}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-error-500/10 text-error-400 text-sm font-semibold border border-error-500/20 hover:bg-error-500/15 disabled:opacity-40 transition-all"
                    title="Delete category (blocked if it has exams)"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-[11px] text-surface-200/30 mt-2">
                  Deleting a category is risky. Remove its exams first.
                </p>
              </div>
            ) : null}
          </div>

          {/* Exams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">Exams</p>
              {selectedLevel ? (
                <span className="text-xs text-surface-200/50">
                  {shortLevelLabel(selectedLevel.name)}
                </span>
              ) : null}
            </div>

            {selectedLevel ? (
              <div className="glass-card p-4 space-y-3">
                <p className="text-xs text-surface-200/60 font-semibold">Add Exam</p>
                <input
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  placeholder="Exam name *"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={newExamCode}
                    onChange={(e) => setNewExamCode(e.target.value)}
                    placeholder="Code (optional) e.g. 117/21"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                  />
                  <input
                    value={newExamNote}
                    onChange={(e) => setNewExamNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void addExam()}
                  disabled={saving || !newExamName.trim()}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-white text-sm font-semibold border border-white/10 hover:border-white/20 disabled:opacity-40 transition-all"
                >
                  + Add Exam
                </button>
              </div>
            ) : (
              <div className="glass-card-light p-4 text-surface-200/40 text-sm">
                Select a category to manage its exams.
              </div>
            )}

            <div className="glass-card p-4">
              {loadingExams ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : exams.length === 0 ? (
                <p className="text-sm text-surface-200/40 text-center py-6">No exams yet</p>
              ) : (
                <div className="space-y-2">
                  {exams.map((e) => (
                    <div key={e._id} className="glass-card-light p-3">
                      {editingExamId === e._id ? (
                        <div className="space-y-2">
                          <input
                            value={editExamName}
                            onChange={(ev) => setEditExamName(ev.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              value={editExamCode}
                              onChange={(ev) => setEditExamCode(ev.target.value)}
                              placeholder="Code (optional)"
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                            />
                            <input
                              value={editExamNote}
                              onChange={(ev) => setEditExamNote(ev.target.value)}
                              placeholder="Note (optional)"
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void saveExam()}
                              disabled={saving || !editExamName.trim()}
                              className="px-3 py-2 rounded-xl gradient-primary text-white text-xs font-semibold disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingExamId(null)}
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
                            <p className="text-sm font-semibold text-white truncate">{e.name}</p>
                            <p className="text-xs text-surface-200/40">
                              {e.code ? `Code: ${e.code}` : "No code"}
                              {e.note ? `  •  ${e.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(e)}
                              className="text-xs text-surface-200/60 hover:text-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteExam(e._id)}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

