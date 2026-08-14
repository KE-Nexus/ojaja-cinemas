"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Star, User } from "lucide-react";
import { formatNaira, formatRuntime, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export type ShowtimeSession = { id: string; startTime: string; auditoriumName: string; format: string; price: number };
export type ShowtimeMovie = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string;
  backdropUrl: string | null;
  runtimeMins: number;
  genres: string;
  classification: string;
  cast: string[];
  rating: number | null;
  reviewCount: number;
  byBranch: { branchName: string; sessions: ShowtimeSession[] }[];
};

export function ShowtimesBoard({ movies }: { movies: ShowtimeMovie[] }) {
  const [selectedId, setSelectedId] = useState(movies[0]?.id ?? null);
  const selected = movies.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mt-8">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {movies.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className={cn(
              "group relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 text-left ring-2 transition-all",
              selectedId === m.id ? "ring-brand-light" : "ring-transparent hover:ring-brand/40"
            )}
          >
            <Image src={m.posterUrl} alt={m.title} fill unoptimized sizes="(max-width: 768px) 30vw, 140px" className="object-cover" />
            {selectedId === m.id && <div className="absolute inset-0 bg-brand/10" />}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-8 overflow-hidden rounded-xl bg-surface">
          <div className="relative h-56 sm:h-72">
            <Image src={selected.backdropUrl ?? selected.posterUrl} alt="" fill unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/10 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-5 sm:p-6">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{selected.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {selected.rating !== null && (
                  <span className="flex items-center gap-1 text-accent-gold">
                    <Star size={13} className="fill-accent-gold" /> {selected.rating.toFixed(1)}{" "}
                    <span className="text-muted">({selected.reviewCount})</span>
                  </span>
                )}
                <span>{formatRuntime(selected.runtimeMins)}</span>
                <span>·</span>
                <span>{selected.genres}</span>
                <span>·</span>
                <span>{selected.classification}</span>
              </div>
              <Link
                href={`/movies/${selected.slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Play size={16} className="fill-black" /> View Details
              </Link>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {selected.cast.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-4">
                {selected.cast.slice(0, 5).map((name) => (
                  <div key={name} className="flex flex-col items-center text-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2">
                      <User size={16} className="text-muted" />
                    </div>
                    <p className="mt-1 line-clamp-1 w-16 text-[11px] text-muted">{name}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-5">
              {selected.byBranch.map(({ branchName, sessions }) => (
                <div key={branchName}>
                  <p className="mb-1.5 text-xs font-medium text-muted">{branchName}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {sessions.map((st) => (
                      <Link
                        key={st.id}
                        href={`/booking/${st.id}/seats`}
                        className="flex shrink-0 flex-col items-center rounded-md bg-surface-2 px-3 py-2 text-xs transition-colors hover:bg-brand/20"
                      >
                        <span className="font-medium">{formatTime(new Date(st.startTime))}</span>
                        <span className="text-muted">
                          {st.auditoriumName} · {st.format}
                        </span>
                        <span className="mt-1 text-brand-light">{formatNaira(st.price)}+</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
