"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

const CATEGORY_STYLES = [
  "from-slate-600 to-slate-800",
  "from-blue-700 to-blue-950",
  "from-amber-700 to-amber-950",
  "from-violet-700 to-violet-950",
  "from-rose-700 to-rose-950",
  "from-emerald-700 to-emerald-950",
];

export function CategoryPills({ categories, activeGenre }: { categories: string[]; activeGenre?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  function handleScroll() {
    setIsScrolling(true);
    if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
    scrollEndTimeout.current = setTimeout(() => setIsScrolling(false), 200);
  }

  return (
    <div ref={scrollerRef} onScroll={handleScroll} className="no-scrollbar overflow-x-auto pb-1">
      <div className={cn("flex gap-3", isScrolling && "pointer-events-none")}>
        <Link
          href="/movies"
          className={cn(
            "flex h-16 w-32 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-semibold transition-transform hover:scale-[1.03]",
            !activeGenre && "ring-2 ring-brand"
          )}
        >
          All
        </Link>
        {categories.map((c, i) => (
          <Link
            key={c}
            href={`/movies?genre=${encodeURIComponent(c)}`}
            className={cn(
              "flex h-16 w-32 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br px-3 text-center text-sm font-semibold text-white transition-transform hover:scale-[1.03]",
              CATEGORY_STYLES[i % CATEGORY_STYLES.length],
              activeGenre === c && "ring-2 ring-brand"
            )}
          >
            {c}
          </Link>
        ))}
      </div>
    </div>
  );
}
