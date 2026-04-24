"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CategoryRow = {
  _id: string;
  slug: string;
  name: { en: string; ml: string };
  sortOrder: number;
};

type TopicRow = {
  id: string;
  name: { en: string; ml: string };
  icon: string;
  color: string;
  categoryId?: string | null;
  dailyWeight?: number;
  sortOrder?: number;
  questionCount?: number;
};

function idFromName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export default function TopicsAdminPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) {
        const list: CategoryRow[] = data.data || [];
        setCategories(list);
        if (!selectedCategoryId && list.length) setSelectedCategoryId(list[0]._id);
      }
    } catch {
      // ignore
    }
  }, [selectedCategoryId]);

  const loadTopics = useCallback(async (categoryId: string) => {
    try {
      const params = categoryId ? `?${new URLSearchParams({ categoryId })}` : "";
      const res = await fetch(`/api/topics${params}`);
      const data = await res.json();
      if (data.success) setTopics(data.data || []);
    } catch {
      setTopics([]);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadCategories();
      setLoading(false);
    }
    void init();
  }, [loadCategories]);

  useEffect(() => {
    void loadTopics(selectedCategoryId);
  }, [selectedCategoryId, loadTopics]);

  const [newNameEn, setNewNameEn] = useState("");
  const [newNameMl, setNewNameMl] = useState("");
  const [newId, setNewId] = useState("");
  const [newIcon, setNewIcon] = useState("📚");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newDailyWeight, setNewDailyWeight] = useState<number>(2);
  const [newSortOrder, setNewSortOrder] = useState<number>(0);

  const addTopic = async () => {
    if (!selectedCategoryId || !newNameEn.trim()) return;
    const id = (newId.trim() || idFromName(newNameEn)).trim();
    if (!id) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: { en: newNameEn.trim(), ml: newNameMl.trim() },
          icon: newIcon,
          color: newColor,
          categoryId: selectedCategoryId,
          dailyWeight: newDailyWeight,
          sortOrder: newSortOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to create topic");
      else {
        setNewNameEn("");
        setNewNameMl("");
        setNewId("");
        setNewIcon("📚");
        setNewColor("#6366f1");
        setNewDailyWeight(2);
        setNewSortOrder(0);
        await loadTopics(selectedCategoryId);
      }
    } catch {
      setError("Failed to create topic");
    } finally {
      setSaving(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameMl, setEditNameMl] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editDailyWeight, setEditDailyWeight] = useState<number>(2);
  const [editSortOrder, setEditSortOrder] = useState<number>(0);

  const startEdit = (t: TopicRow) => {
    setEditingId(t.id);
    setEditNameEn(t.name?.en || "");
    setEditNameMl(t.name?.ml || "");
    setEditIcon(t.icon || "📚");
    setEditColor(t.color || "#6366f1");
    setEditDailyWeight(typeof t.dailyWeight === "number" ? t.dailyWeight : 2);
    setEditSortOrder(typeof t.sortOrder === "number" ? t.sortOrder : 0);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/topics/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: { en: editNameEn.trim(), ml: editNameMl.trim() },
          icon: editIcon,
          color: editColor,
          categoryId: selectedCategoryId,
          dailyWeight: editDailyWeight,
          sortOrder: editSortOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to update topic");
      else await loadTopics(selectedCategoryId);
      setEditingId(null);
    } catch {
      setError("Failed to update topic");
    } finally {
      setSaving(false);
    }
  };

  const deleteTopic = async (id: string) => {
    if (!confirm("Delete this topic?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/topics/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Failed to delete topic");
      else await loadTopics(selectedCategoryId);
    } catch {
      setError("Failed to delete topic");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Topics</h2>
        <p className="text-sm text-surface-200/50">Create/edit/delete topics under each category.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setSelectedCategoryId(c._id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategoryId === c._id
                  ? "bg-primary-500/30 text-primary-300 border border-primary-400/50"
                  : "bg-white/5 text-surface-200/50 border border-white/10 hover:border-white/20"
              }`}
            >
              {c.name?.en || c.slug}
            </button>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider">
              {selectedCategory ? `Topics — ${selectedCategory.name.en}` : "Topics"}
            </p>
            <button
              type="button"
              onClick={() => void loadTopics(selectedCategoryId)}
              className="text-xs text-surface-200/50 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>

          {error && <p className="text-xs text-error-500 mb-3">{error}</p>}

          {topics.length === 0 ? (
            <p className="text-sm text-surface-200/40 text-center py-6">No topics yet</p>
          ) : (
            <div className="space-y-2">
              {topics.map((t) => (
                <div key={t.id} className="glass-card-light p-3">
                  {editingId === t.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={editNameEn}
                          onChange={(e) => setEditNameEn(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                        <input
                          value={editNameMl}
                          onChange={(e) => setEditNameMl(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                        <input
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={editDailyWeight}
                          onChange={(e) => setEditDailyWeight(parseInt(e.target.value || "2", 10))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={editSortOrder}
                          onChange={(e) => setEditSortOrder(parseInt(e.target.value || "0", 10))}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void saveEdit()}
                          disabled={saving || !editNameEn.trim()}
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
                        <p className="text-sm font-semibold text-white truncate">
                          {t.icon} {t.name.en}
                        </p>
                        <p className="text-xs text-surface-200/40 truncate">ID: {t.id}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className="text-xs text-surface-200/60 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTopic(t.id)}
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

        <div className="glass-card p-4">
          <p className="text-xs text-surface-200/40 font-semibold uppercase tracking-wider mb-3">
            Add Topic
          </p>
          <div className="space-y-2">
            <input
              value={newNameEn}
              onChange={(e) => {
                setNewNameEn(e.target.value);
                if (!newId.trim()) setNewId(idFromName(e.target.value));
              }}
              placeholder="Name (EN) *"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            />
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="ID (e.g. kerala_history) *"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            />
            <input
              value={newNameMl}
              onChange={(e) => setNewNameMl(e.target.value)}
              placeholder="Name (ML)"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="Icon"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
              <input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Color"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={newDailyWeight}
                onChange={(e) => setNewDailyWeight(parseInt(e.target.value || "2", 10))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
              <input
                type="number"
                value={newSortOrder}
                onChange={(e) => setNewSortOrder(parseInt(e.target.value || "0", 10))}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => void addTopic()}
              disabled={saving || !selectedCategoryId || !newNameEn.trim() || !newId.trim()}
              className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold disabled:opacity-40 transition-all"
            >
              + Add Topic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

