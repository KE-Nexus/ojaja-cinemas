"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MapPinPlus } from "lucide-react";
import { toast } from "sonner";
import { addPosItemToLocationAction } from "@/actions/admin/pos-items";
import { cn } from "@/lib/cn";

export function AddToLocationButton({ itemId, itemName, branches }: { itemId: string; itemName: string; branches: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addTo(branchId: string, branchName: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await addPosItemToLocationAction(itemId, branchId);
      if (result.error) toast.error(result.error);
      else toast.success(`Added "${itemName}" to ${branchName}.`);
    });
  }

  if (branches.length === 0) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-muted hover:text-brand-light disabled:opacity-50"
        aria-label="Add to location"
        title="Add to location"
      >
        <MapPinPlus size={15} />
      </button>
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg",
            "max-h-64 overflow-y-auto"
          )}
        >
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Add to location</p>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => addTo(b.id, b.name)}
              className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
