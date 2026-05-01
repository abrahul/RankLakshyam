"use client";

import { useState } from "react";
import { CurrentAffairsQuestionForm } from "@/components/admin/current-affairs-question-form";

export default function AdminCADailyPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="glass-card-light p-4 mb-6 flex items-center gap-4">
        <label className="text-xs font-semibold text-surface-200/60 w-20">Date</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
        />
      </div>

      <CurrentAffairsQuestionForm
        scope={{ caType: "daily", date }}
        endpoint="/api/admin/ca/daily"
        maxItems={100}
      />
    </div>
  );
}
