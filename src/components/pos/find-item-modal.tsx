"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Delete, Plus } from "lucide-react";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { formatNaira } from "@/lib/format";

type ItemOption = { id: string; name: string; price: number; group: string; imageUrl: string | null };

const KEY_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

export function FindItemModal({
  items,
  onAdd,
  onClose,
}: {
  items: ItemOption[];
  onAdd: (item: ItemOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.group.toLowerCase().includes(q));
  }, [items, query]);

  function press(key: string) {
    setQuery((v) => v + key);
  }

  return (
    <PosModalShell title="Find Item" onClose={onClose} widthClass="max-w-2xl">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by item name or group..."
        autoFocus
        className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-muted focus:border-brand-light"
      />

      <div className="mb-4 max-h-56 space-y-1.5 overflow-y-auto">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No items match &ldquo;{query}&rdquo;.</p>
        ) : (
          results.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                onAdd(it);
                toast.success(`Added ${it.name}`);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-brand-light/60 hover:bg-white/[0.07]"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{it.name}</p>
                <p className="text-xs text-muted">{it.group}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-semibold text-brand-light">{formatNaira(it.price)}</span>
                <Plus size={14} className="text-muted" />
              </div>
            </button>
          ))
        )}
      </div>

      <div className="space-y-1.5">
        {KEY_ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => press(key)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-semibold text-white transition-all hover:border-brand-light/50 hover:bg-white/10 active:scale-95 sm:h-10 sm:w-10"
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5">
          <button
            onClick={() => press(" ")}
            className="h-9 flex-1 max-w-xs rounded-lg border border-white/10 bg-white/5 text-sm font-semibold text-white transition-all hover:border-brand-light/50 hover:bg-white/10 active:scale-95 sm:h-10"
          >
            Space
          </button>
          <button
            onClick={() => setQuery((v) => v.slice(0, -1))}
            className="flex h-9 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition-all hover:border-brand-light/50 hover:bg-white/10 active:scale-95 sm:h-10"
          >
            <Delete size={16} />
          </button>
          <button
            onClick={() => setQuery("")}
            className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-muted transition-all hover:border-brand-light/50 hover:text-white active:scale-95 sm:h-10"
          >
            Clear
          </button>
        </div>
      </div>
    </PosModalShell>
  );
}
