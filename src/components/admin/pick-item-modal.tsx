"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type PickableOption = { id: string; label: string; defaultPrice: number };

export function RoundToggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        checked ? "border-brand bg-brand" : "border-border"
      )}
    >
      {checked && <Check size={12} className="text-white" strokeWidth={3} />}
    </span>
  );
}

export function PickItemModal({
  options,
  selectedIds,
  columns,
  onToggle,
  onToggleAll,
  onClose,
}: {
  options: PickableOption[];
  selectedIds: Set<string>;
  columns: 1 | 3;
  onToggle: (id: string) => void;
  onToggleAll: (visibleIds: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand px-5 py-3.5">
          <h3 className="font-semibold text-white">Pick an Item</h3>
        </div>

        <div className="border-b border-border p-4">
          <div className="relative">
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type here..." className="pl-9" />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <label className="flex cursor-pointer items-center justify-between border-b border-border/50 px-5 py-2.5 text-sm hover:bg-white/5">
            Select All
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => onToggleAll(filtered.map((o) => o.id))}
              className="sr-only"
            />
            <RoundToggle checked={allVisibleSelected} />
          </label>

          {filtered.length === 0 ? (
            <p className="p-5 text-center text-sm text-muted">No matches.</p>
          ) : (
            <div className={columns === 3 ? "grid grid-cols-1 sm:grid-cols-3" : "grid grid-cols-1"}>
              {filtered.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center justify-between gap-2 px-5 py-2.5 text-sm text-brand-light hover:bg-white/5"
                >
                  <span className="truncate">{o.label}</span>
                  <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => onToggle(o.id)} className="sr-only" />
                  <RoundToggle checked={selectedIds.has(o.id)} />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
