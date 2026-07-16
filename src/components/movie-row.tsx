"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { Reveal } from "@/components/decor/reveal";
import { cn } from "@/lib/cn";

export function MovieRow({
  title,
  movies,
  viewAllHref,
}: {
  title: string;
  movies: MovieCardData[];
  viewAllHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);

    // Suppress hover while content is moving under the cursor — otherwise cards
    // sliding past a stationary pointer rapidly hover in/out and visibly jitter.
    setIsScrolling(true);
    if (scrollEndTimeout.current) clearTimeout(scrollEndTimeout.current);
    scrollEndTimeout.current = setTimeout(() => setIsScrolling(false), 200);
  }

  function scrollByPage(direction: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }

  if (movies.length === 0) return null;

  return (
    <section className="py-6">
      <Reveal>
        <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-10">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm font-medium text-muted hover:text-foreground">
              View all
            </Link>
          )}
        </div>
      </Reveal>

      <div className="group/row relative">
        <button
          onClick={() => scrollByPage(-1)}
          aria-label="Scroll left"
          className={cn(
            "absolute left-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-background to-transparent text-foreground transition-opacity sm:flex md:w-14",
            atStart ? "pointer-events-none opacity-0" : "opacity-0 group-hover/row:opacity-100"
          )}
        >
          <ChevronLeft size={28} />
        </button>

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="no-scrollbar overflow-x-auto px-4 sm:px-6 lg:px-10"
        >
          <div className={cn("flex gap-2.5 sm:gap-3", isScrolling && "pointer-events-none")}>
            {movies.map((movie, i) => (
              <div key={movie.slug} className="w-[42vw] shrink-0 sm:w-[180px] lg:w-[200px]">
                <MovieCard movie={movie} index={i} compact />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => scrollByPage(1)}
          aria-label="Scroll right"
          className={cn(
            "absolute right-0 top-0 z-20 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-background to-transparent text-foreground transition-opacity sm:flex md:w-14",
            atEnd ? "pointer-events-none opacity-0" : "opacity-0 group-hover/row:opacity-100"
          )}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </section>
  );
}
