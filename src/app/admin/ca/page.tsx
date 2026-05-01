"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "manage" | "import";
type ImportMode = "date" | "month";

interface Entry {
  _id: string;
  question_en: string;
  question_ml: string;
  answer_en: string;
  answer_ml: string;
  explanation_en: string;
  explanation_ml: string;
  date: string | null;
  month: number;
  year: number;
  is_important: boolean;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCAPage() {
  const [activeTab, setActiveTab] = useState<Tab>("manage");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["manage", "import"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              activeTab === t
                ? "gradient-primary text-white"
                : "bg-white/5 text-surface-200/60 hover:bg-white/10"
            }`}
          >
            {t === "manage" ? "📋 Manage Entries" : "📥 Bulk Import"}
          </button>
        ))}
      </div>

      {activeTab === "manage" ? <ManageTab /> : <ImportTab />}
    </div>
  );
}

// ─── Manage Tab ──────────────────────────────────────────────────────────────

function ManageTab() {
  const now = new Date();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<Entry | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ca/monthly?month=${filterMonth}&year=${filterYear}&limit=100`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, [filterMonth, filterYear]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const res = await fetch(`/api/admin/ca/${id}`, { method: "DELETE" });
      if (res.ok) setItems(prev => prev.filter(i => i._id !== id));
    } catch (err) { alert("Delete failed"); }
  };

  const filtered = items.filter(i => 
    i.question_en.toLowerCase().includes(search.toLowerCase()) || 
    i.question_ml.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="glass-card-light p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-200/50">Month</span>
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white"
          >
            {MONTHS.map((m, idx) => <option key={idx} value={idx+1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-200/50">Year</span>
          <input 
            type="number" 
            value={filterYear} 
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white w-20"
          />
        </div>
        <input 
          type="text" 
          placeholder="Search questions..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-white flex-1 min-w-[200px]"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-surface-200/40">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item._id} className="glass-card p-4 flex gap-4 items-start group hover:border-primary-500/20">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                   {item.date && <span className="text-[10px] bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded font-bold uppercase">{item.date.slice(0,10)}</span>}
                   {item.is_important && <span className="text-amber-400 text-xs">⭐ Important</span>}
                </div>
                <p className="text-sm font-semibold text-white">{item.question_en}</p>
                <p className="text-sm text-surface-200/70">{item.question_ml}</p>
                <div className="pt-2">
                  <p className="text-xs text-primary-400 font-bold">Ans: {item.answer_en}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingItem(item)}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-white/5 text-surface-200 hover:bg-white/10"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item._id)}
                  className="px-3 py-1.5 text-xs font-bold rounded bg-error-500/10 text-error-500 hover:bg-error-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 text-surface-200/30">No entries found</div>}
        </div>
      )}

      {editingItem && (
        <EditModal item={editingItem} onClose={() => setEditingItem(null)} onSave={() => { setEditingItem(null); fetchItems(); }} />
      )}
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditModal({ item, onClose, onSave }: { item: Entry; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState(item);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ca/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) onSave();
      else alert("Update failed");
    } catch (err) { alert("Error updating"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
        <h3 className="text-lg font-bold text-white mb-6">Edit Current Affair</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-surface-200/50 block mb-1">Question (EN)</label>
              <textarea 
                value={formData.question_en} 
                onChange={e => setFormData({...formData, question_en: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-surface-200/50 block mb-1">Question (ML)</label>
              <textarea 
                value={formData.question_ml} 
                onChange={e => setFormData({...formData, question_ml: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="text-xs text-surface-200/50 block mb-1">Answer (EN)</label>
              <input 
                type="text"
                value={formData.answer_en} 
                onChange={e => setFormData({...formData, answer_en: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-surface-200/50 block mb-1">Answer (ML)</label>
              <input 
                type="text"
                value={formData.answer_ml} 
                onChange={e => setFormData({...formData, answer_ml: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.is_important} 
                onChange={e => setFormData({...formData, is_important: e.target.checked})}
                className="accent-primary-500"
              />
              <span className="text-sm text-white">Mark as Important</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 text-surface-200 hover:bg-white/10 text-sm font-bold">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg gradient-primary text-white text-sm font-bold disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Import Tab (Refactored Unified Logic) ───────────────────────────────────

function ImportTab() {
  const [mode, setMode] = useState<ImportMode>("date");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [jsonInput, setJsonInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setUploading(true);
    setResult(null);
    try {
      let parsed;
      try { parsed = JSON.parse(jsonInput); } catch { alert("Invalid JSON"); return; }
      
      const url = mode === "date" ? "/api/admin/ca/daily" : "/api/admin/ca/monthly";
      const body = mode === "date" ? { date, entries: parsed } : { month, year, entries: parsed };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setJsonInput("");
      } else alert(data.error?.message || "Upload failed");
    } catch (err) { alert("Network error"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 space-y-4">
        <div className="flex gap-6 border-b border-white/5 pb-4">
           {(["date", "month"] as ImportMode[]).map(m => (
             <label key={m} className="flex items-center gap-2 cursor-pointer">
               <input type="radio" checked={mode === m} onChange={() => setMode(m)} className="accent-primary-500" />
               <span className="text-sm font-semibold text-white capitalize">{m === "date" ? "By Date (Daily)" : "By Month (Bulk)"}</span>
             </label>
           ))}
        </div>

        <div className="flex items-center gap-4">
          {mode === "date" ? (
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white" />
          ) : (
            <div className="flex gap-3">
               <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
               </select>
               <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white w-24" />
            </div>
          )}
          <label className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg cursor-pointer text-surface-200 transition-all ml-auto">
             📁 Upload JSON
             <input type="file" className="hidden" accept=".json" onChange={e => {
               const file = e.target.files?.[0];
               if (!file) return;
               const reader = new FileReader();
               reader.onload = (ev) => setJsonInput(ev.target?.result as string);
               reader.readAsText(file);
             }} />
          </label>
        </div>

        <textarea
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder="Paste JSON array here..."
          className="w-full h-64 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono text-white resize-none focus:outline-none focus:border-primary-500/50"
        />

        <button 
          onClick={handleUpload}
          disabled={uploading || !jsonInput}
          className="w-full py-3 rounded-xl gradient-primary text-white font-bold disabled:opacity-50 transition-all"
        >
          {uploading ? "Processing..." : "Start Import"}
        </button>
      </div>

      {result && (
        <div className="glass-card p-5 border-success-500/30 animate-slide-up">
           <h4 className="text-sm font-bold text-success-500 mb-2">Import Result</h4>
           <div className="flex gap-8 text-xs text-surface-200/60">
              <p>Inserted: <span className="text-white font-bold">{result.inserted}</span></p>
              <p>Skipped: <span className="text-amber-400 font-bold">{result.skipped}</span></p>
              <p>Errors: <span className="text-error-500 font-bold">{result.writeErrors?.length || 0}</span></p>
           </div>
        </div>
      )}
    </div>
  );
}
