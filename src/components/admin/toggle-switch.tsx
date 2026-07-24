"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";

export function ToggleSwitch({ checked, onToggle }: { checked: boolean; onToggle: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={isPending}
      onClick={() => startTransition(onToggle)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-50",
        checked ? "border-brand bg-brand" : "border-border bg-surface-2"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
