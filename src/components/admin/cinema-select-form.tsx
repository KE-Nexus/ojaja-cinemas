"use client";

import { Select } from "@/components/ui/input";

export function CinemaSelectForm({ branches, selected }: { branches: { id: string; name: string }[]; selected?: string }) {
  return (
    <form method="get" className="mb-4 max-w-xs">
      <Select name="cinema" defaultValue={selected ?? ""} onChange={(e) => e.currentTarget.form?.submit()}>
        <option value="">Select Cinema</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </form>
  );
}
