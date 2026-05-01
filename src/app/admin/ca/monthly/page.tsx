"use client";

import { useState } from "react";
import { CurrentAffairsQuestionForm } from "@/components/admin/current-affairs-question-form";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function AdminCAMonthlyPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const years = Array.from({ length: 5 }, (_, index) => now.getFullYear() - 2 + index);

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="glass-card-light p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-surface-200/60">Month</label>
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
          >
            {MONTHS.map((name, index) => (
              <option key={index + 1} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-surface-200/60">Year</label>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-primary-400/50 focus:outline-none"
          >
            {years.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </div>
      </div>

      <CurrentAffairsQuestionForm
        scope={{ caType: "monthly", month, year }}
        endpoint="/api/admin/ca/monthly"
        maxItems={500}
      />
    </div>
  );
}
