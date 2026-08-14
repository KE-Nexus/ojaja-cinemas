"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function SiteLocationSelect({
  branches,
  selected,
  basePath,
}: {
  branches: { id: string; name: string }[];
  selected: string;
  basePath: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedName = branches.find((b) => b.id === selected)?.name ?? "All Cinemas";

  function pick(value: string) {
    setOpen(false);
    const sp = new URLSearchParams(window.location.search);
    sp.set("location", value);
    router.push(`${basePath}?${sp.toString()}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium uppercase tracking-wide"
      >
        <MapPin size={14} className="shrink-0 text-muted" />
        {selectedName}
        <ChevronDown size={14} className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
          <button
            onClick={() => pick("")}
            className={cn(
              "flex w-full items-center px-3.5 py-2 text-left text-sm hover:bg-surface-2",
              selected === "" ? "text-brand-light" : "text-foreground"
            )}
          >
            All Cinemas
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => pick(b.id)}
              className={cn(
                "flex w-full items-center px-3.5 py-2 text-left text-sm hover:bg-surface-2",
                selected === b.id ? "text-brand-light" : "text-foreground"
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
