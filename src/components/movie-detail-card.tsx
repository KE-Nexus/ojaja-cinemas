"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatRuntime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MovieCardData } from "@/components/movie-card";

export type MovieShowtimeHint = { time: string; label: string; href: string };

export function MovieDetailCard({ movie, showtimes }: { movie: MovieCardData; showtimes: MovieShowtimeHint[] }) {
  const [expanded, setExpanded] = useState(false);
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-surface p-3 sm:p-4">
      <Link href={`/movies/${movie.slug}`} className="relative aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-32">
        <Image src={movie.posterUrl} alt={movie.title} fill unoptimized referrerPolicy="no-referrer" sizes="150px" className="object-cover" />
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/movies/${movie.slug}`}>
          <h3 className="text-lg font-extrabold leading-tight tracking-tight hover:text-brand-light sm:text-xl">{movie.title}</h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="rounded border border-border px-1.5 py-0.5 font-semibold text-foreground">{movie.classification}</span>
          <span className="text-border">|</span>
          {year && (
            <>
              <span>{year}</span>
              <span className="text-border">|</span>
            </>
          )}
          <span>{movie.genres}</span>
          <span className="text-border">|</span>
          <span>{formatRuntime(movie.runtimeMins)}</span>
        </div>

        {movie.synopsis && (
          <p className={cn("mt-2.5 text-sm text-muted", !expanded && "line-clamp-2")}>
            {movie.synopsis}{" "}
            <button type="button" onClick={() => setExpanded((v) => !v)} className="font-medium text-brand-light hover:underline">
              {expanded ? "Show Less" : "Read More"}
            </button>
          </p>
        )}

        {showtimes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {showtimes.map((st) => (
              <Link
                key={st.href}
                href={st.href}
                className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-brand/20"
              >
                <span>{st.time}</span>
                <span className="text-muted">{st.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
