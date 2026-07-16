"use client";

export function BranchSelectForm({
  branches,
  selectedBranchId,
  dateParam,
}: {
  branches: { id: string; name: string }[];
  selectedBranchId?: string;
  dateParam: string;
}) {
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
