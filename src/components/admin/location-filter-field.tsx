import { MapPin } from "lucide-react";
import { Select } from "@/components/ui/input";

export function LocationFilterField({
  branches,
  selected,
  locked,
}: {
  branches: { id: string; name: string }[];
  selected?: string;
  locked: boolean;
}) {
  if (locked) {
    const branch = branches.find((b) => b.id === selected);
    return (
      <span className="flex max-w-xs items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
        <MapPin size={14} /> {branch?.name ?? "No cinema assigned"}
      </span>
    );
  }

  return (
    <Select name="location" defaultValue={selected ?? ""} className="max-w-xs">
      <option value="">All Locations</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </Select>
  );
}
