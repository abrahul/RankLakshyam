"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CategoryRow = {
  _id: string;
  slug: string;
  name: { en: string; ml: string };
  sortOrder: number;
};

type ExamRow = {
  _id: string;
  name: string;
  code: string | null;
  note?: string;
  categoryId:
    | string
    | {
        _id: string;
        slug?: string;
        name?: { en?: string; ml?: string };
      };
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError("");
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        const list: CategoryRow[] = data.data || [];
        setCategories(list);
        if (!selectedCategoryId && list.length) setSelectedCategoryId(list[0]._id);
      } else {
        setError(data.error?.message || "Failed to load categories");
      }
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoadingCategories(false);
    }
  }, [selectedCategoryId]);

  const loadExams = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setExams([]);
      return;
    }
    setLoadingExams(true);
    setError("");
    try {
      const params = new URLSearchParams({ categoryId });
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
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadExams(selectedCategoryId);
  }, [selectedCategoryId, loadExams]);

  // Category form
  const [catSlug, setCatSlug] = useState("");
  const [catEn, setCatEn] = useState("");
  const [catMl, setCatMl] = useState("");
  const [catSort, setCatSort] = useState<number>(0);

  useEffect(() => {
    if (!selectedCategory) return;
    setCatSlug(selectedCategory.slug || "");
    setCatEn(selectedCategory.name?.en || "");
    setCatMl(selectedCategory.name?.ml || "");
    setCatSort(selectedCategory.sortOrder ?? 0);
  }, [selectedCategory?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveCategory = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${selectedCategory._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: catSlug.trim().toLowerCase(),
          name: { en: catEn.trim(), ml: catMl.trim() },
          sortOrder: catSort,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to save category");
      else await loadCategories();
    } catch {
      setError("Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!selectedCategory) return;
    if (!confirm(`Delete category "${selectedCategory.name?.en || selectedCategory.slug}"? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories/${selectedCategory._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to delete category");
      } else {
        setSelectedCategoryId("");
        setExams([]);
        await loadCategories();
      }
    } catch {
      setError("Failed to delete category");
    } finally {
      setSaving(false);
    }
  };

  const [newCatEn, setNewCatEn] = useState("");
  const [newCatMl, setNewCatMl] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");

  const addCategory = async () => {
    const en = newCatEn.trim();
    if (!en) return;
    const slug = (newCatSlug.trim() || slugify(en)).toLowerCase();
    if (!slug) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name: { en, ml: newCatMl.trim() },
          sortOrder: categories.length,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to add category");
      else {
        setNewCatEn("");
        setNewCatMl("");
        setNewCatSlug("");
        await loadCategories();
      }
    } catch {
      setError("Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  // Exam editor
  const [newExamName, setNewExamName] = useState("");
  const [newExamCode, setNewExamCode] = useState("");
  const [newExamNote, setNewExamNote] = useState("");

  const addExam = async () => {
    if (!selectedCategory) return;
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
          note: newExamNote.trim(),
          categoryId: selectedCategory._id,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to add exam");
      else {
        setNewExamName("");
        setNewExamCode("");
        setNewExamNote("");
        await loadExams(selectedCategory._id);
      }
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

  const startEditExam = (e: ExamRow) => {
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
          note: editExamNote.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to save exam");
      else if (selectedCategory) await loadExams(selectedCategory._id);
      setEditingExamId(null);
    } catch {
      setError("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm("Delete this exam?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to delete exam");
      else if (selectedCategory) await loadExams(selectedCategory._id);
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
          Admin-driven categories (10th/12th/Degree/Others) and exam list for filtering.
        </p>
      </div>

      {loadingCategories ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Category list */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">
                Categories
              </p>
              <button
                type="button"
                onClick={() => void loadCategories()}
                className="text-xs text-surface-200/50 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-surface-200/40 text-center py-6">No categories yet</p>
              ) : (
                categories
                  .slice()
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setSelectedCategoryId(c._id)}
                      className={`w-full text-left glass-card-light p-3 transition-all ${
                        selectedCategoryId === c._id
                          ? "border-primary-400/40 bg-primary-500/10"
                          : "hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white truncate">
                        {c.name?.en || c.slug}
                      </p>
                      <p className="text-xs text-surface-200/40 truncate">
                        Slug: {c.slug} • Sort: {c.sortOrder ?? 0}
                      </p>
                    </button>
                  ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
              <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">
                Add Category
              </p>
              <input
                value={newCatEn}
                onChange={(e) => {
                  setNewCatEn(e.target.value);
                  if (!newCatSlug.trim()) setNewCatSlug(slugify(e.target.value));
                }}
                placeholder="Name (EN) *"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
              <input
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                placeholder="Slug (e.g. 10th_level) *"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
              <input
                value={newCatMl}
                onChange={(e) => setNewCatMl(e.target.value)}
                placeholder="Name (ML)"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void addCategory()}
                disabled={saving || !newCatEn.trim() || !newCatSlug.trim()}
                className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-40 transition-all"
              >
                + Add Category
              </button>
            </div>
          </div>

          {/* Category editor */}
          <div className="glass-card p-4 lg:col-span-2 space-y-4">
            {!selectedCategory ? (
              <div className="text-surface-200/40 text-sm py-10 text-center">
                Select a category to edit and manage exams.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-1">
                      Category Details
                    </p>
                    <p className="text-white font-semibold text-sm truncate">
                      {selectedCategory.name?.en || selectedCategory.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveCategory()}
                      disabled={saving || !catEn.trim() || !catSlug.trim()}
                      className="px-3 py-2 rounded-xl gradient-primary text-white text-xs font-semibold disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCategory()}
                      disabled={saving}
                      className="px-3 py-2 rounded-xl bg-white/5 text-error-400/70 text-xs font-semibold border border-white/10 hover:border-white/20 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">
                      Name (EN)
                    </label>
                    <input
                      value={catEn}
                      onChange={(e) => setCatEn(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">
                      Name (ML)
                    </label>
                    <input
                      value={catMl}
                      onChange={(e) => setCatMl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">
                      Slug
                    </label>
                    <input
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-surface-200/60 font-semibold mb-1.5 block">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={catSort}
                      onChange={(e) => setCatSort(parseInt(e.target.value || "0", 10))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-error-500">{error}</p>}

                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-3">
                    Exams
                  </p>

                  <div className="glass-card-light p-4 space-y-3 mb-4">
                    <p className="text-xs text-surface-200/60 font-semibold">Add New Exam</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                        placeholder="Name *"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                      />
                      <input
                        value={newExamCode}
                        onChange={(e) => setNewExamCode(e.target.value)}
                        placeholder="Code (optional)"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                      />
                      <input
                        value={newExamNote}
                        onChange={(e) => setNewExamNote(e.target.value)}
                        placeholder="Note (optional)"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void addExam()}
                      disabled={saving || !newExamName.trim()}
                      className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-40 transition-all"
                    >
                      + Add Exam
                    </button>
                  </div>

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
                                  {e.note ? ` • ${e.note}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditExam(e)}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

