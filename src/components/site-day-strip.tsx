"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";

type DayOption = { key: string; label: string; href: string; active: boolean };

export function SiteDayStrip({
  days,
  basePath,
  dateActive,
}: {
  days: DayOption[];
  basePath: string;
  dateActive: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-border pb-1">
      <div className="flex flex-1 flex-wrap gap-x-1">
        {days.map((d) => (
          <Link
            key={d.key}
            href={d.href}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-xs font-semibold tracking-wide transition-colors",
              d.active ? "border-brand text-foreground" : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {d.label}
          </Link>
        ))}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const el = inputRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") el.showPicker();
            else el.focus();
          }}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            dateActive ? "border-brand-light text-brand-light" : "border-border text-muted hover:border-brand-light hover:text-foreground"
          )}
        >
          <Calendar size={13} />
          Choose Date
        </button>
        <input
          ref={inputRef}
          type="date"
          style={{ colorScheme: "dark" }}
          className="absolute inset-x-0 top-full h-0 w-full opacity-0"
          tabIndex={-1}
          onChange={(e) => {
            if (!e.target.value) return;
            const sp = new URLSearchParams(window.location.search);
            sp.delete("day");
            sp.set("date", e.target.value);
            router.push(`${basePath}?${sp.toString()}`);
          }}
        />
      </div>
    </div>
  );
}
