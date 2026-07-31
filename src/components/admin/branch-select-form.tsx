"use client";

import { MapPin } from "lucide-react";

export function BranchSelectForm({
  branches,
  selectedBranchId,
  dateParam,
  locked,
}: {
  branches: { id: string; name: string }[];
  selectedBranchId?: string;
  dateParam: string;
  /** Non-CircuitAdmin staff are locked to their own cinema — show it as a plain label, not a switcher. */
  locked?: boolean;
}) {
  if (locked) {
    const branch = branches.find((b) => b.id === selectedBranchId);
    return (
      <span className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
        <MapPin size={14} /> {branch?.name ?? "No cinema assigned"}
      </span>
    );
  }

  return (
    <form method="get" className="flex items-center gap-2">
      <input type="hidden" name="date" value={dateParam} />
      <select
        name="branch"
        defaultValue={selectedBranchId}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </form>
  );
}
