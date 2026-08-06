"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { WEEK_DAYS } from "@/lib/validation";

export function DaySelectorField({ initialDays }: { initialDays: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialDays));
  const allSelected = WEEK_DAYS.every((d) => selected.has(d));

  function toggleDay(day: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(WEEK_DAYS));
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground/90">Select Day(s)</p>
      <p className="mb-2.5 text-xs text-muted">Kindly select any day or days you would like to add to your Price card</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleAll}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
            allSelected ? "border-brand bg-brand text-white" : "border-border bg-surface-2/80 text-foreground/90 hover:border-brand/50"
          )}
        >
          ALL
        </button>
        {WEEK_DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              selected.has(day) ? "border-brand bg-brand text-white" : "border-border bg-surface-2/80 text-foreground/90 hover:border-brand/50"
            )}
          >
            {day}
          </button>
        ))}
      </div>
      {Array.from(selected).map((day) => (
        <input key={day} type="hidden" name="days" value={day} />
      ))}
      {selected.size === 0 && <p className="mt-1.5 text-xs text-danger">Select at least one day.</p>}
    </div>
  );
}
