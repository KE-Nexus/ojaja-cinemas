import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Select } from "@/components/ui/input";
import { formatNaira, formatRuntime, formatTime } from "@/lib/format";
import { seatPrice } from "@/lib/booking";
import { withRatings } from "@/lib/ratings";
import { getSelectedLocationId } from "@/lib/location-session";
import { Play, Star, User } from "lucide-react";

export const metadata: Metadata = { title: "Showtimes" };

function startOfDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function ShowtimesPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; date?: string; movie?: string }>;
}) {
  const { branch, date, movie } = await searchParams;

  // No explicit choice yet (first visit) — default to the guest's selected cinema.
  // An explicit empty string means they deliberately picked "All Cinemas".
  const effectiveBranch = branch === undefined ? await getSelectedLocationId() : branch;

  const dayOffset = date ? Number(date) : 0;
  const dayStart = startOfDay(dayOffset);
  const dayEnd = startOfDay(dayOffset + 1);

  const [branches, movies, showtimes] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({ where: { status: "NOW_SHOWING" }, orderBy: { title: "asc" } }),
    prisma.showtime.findMany({
      where: {
        startTime: { gte: dayStart, lt: dayEnd },
        ...(effectiveBranch ? { auditorium: { branchId: effectiveBranch } } : {}),
        ...(movie ? { movie: { slug: movie } } : {}),
      },
      include: { movie: true, auditorium: { include: { branch: true } } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const byMovie = new Map<string, typeof showtimes>();
  for (const st of showtimes) {
    const list = byMovie.get(st.movie.id) ?? [];
    list.push(st);
    byMovie.set(st.movie.id, list);
  }

  const distinctMovies = Array.from(byMovie.values()).map((list) => list[0].movie);
  const ratedMovies = await withRatings(distinctMovies);
  const ratingByMovieId = new Map(ratedMovies.map((m) => [m.id, m]));

  const dayOptions = Array.from({ length: 7 }, (_, i) => ({
    value: i,
    label: startOfDay(i).toLocaleDateString("en-NG", { weekday: "short", day: "2-digit", month: "short" }),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-10">
      <h1 className="text-3xl font-bold tracking-tight">Showtimes</h1>

      <form className="mt-6 grid gap-3 sm:grid-cols-3" method="get">
        <Select name="branch" defaultValue={effectiveBranch ?? ""}>
          <option value="">All Cinemas</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.city})
            </option>
          ))}
        </Select>
        <Select name="movie" defaultValue={movie ?? ""}>
          <option value="">All Movies</option>
          {movies.map((m) => (
            <option key={m.id} value={m.slug}>
              {m.title}
            </option>
          ))}
        </Select>
        <Select name="date" defaultValue={String(dayOffset)}>
          {dayOptions.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      </form>

      {byMovie.size === 0 ? (
        <p className="mt-16 text-center text-muted">No showtimes match your filters for this day.</p>
      ) : (
        <div className="mt-10 space-y-10">
          {Array.from(byMovie.entries()).map(([movieId, list]) => {
            const m = list[0].movie;
            const rated = ratingByMovieId.get(movieId);
            const castMembers = m.cast
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
              .slice(0, 5);

            const byBranch = list.reduce<Record<string, typeof list>>((acc, st) => {
              const key = st.auditorium.branch.name;
              (acc[key] ??= []).push(st);
              return acc;
            }, {});

            return (
              <div key={movieId} className="overflow-hidden rounded-xl bg-surface">
                <div className="relative h-56 sm:h-72">
                  <Image src={m.backdropUrl ?? m.posterUrl} alt="" fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 w-full p-5 sm:p-6">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{m.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      {rated && rated.rating !== null && (
                        <span className="flex items-center gap-1 text-accent-gold">
                          <Star size={13} className="fill-accent-gold" /> {rated.rating.toFixed(1)}{" "}
                          <span className="text-muted">({rated.reviewCount})</span>
                        </span>
                      )}
                      <span>{formatRuntime(m.runtimeMins)}</span>
                      <span>·</span>
                      <span>{m.genres}</span>
                      <span>·</span>
                      <span>{m.classification}</span>
                    </div>
                    <Link
                      href={`/movies/${m.slug}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
                    >
                      <Play size={16} className="fill-black" /> View Details
                    </Link>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  {castMembers.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-4">
                      {castMembers.map((name) => (
                        <div key={name} className="flex flex-col items-center text-center">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2">
                            <User size={16} className="text-muted" />
                          </div>
                          <p className="mt-1 line-clamp-1 w-16 text-[11px] text-muted">{name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4">
                    {Object.entries(byBranch).map(([branchName, sts]) => (
                      <div key={branchName}>
                        <p className="mb-1.5 text-xs font-medium text-muted">{branchName}</p>
                        <div className="flex flex-wrap gap-2">
                          {sts.map((st) => (
                            <Link
                              key={st.id}
                              href={`/booking/${st.id}/seats`}
                              className="flex flex-col items-center rounded-md bg-surface-2 px-3 py-2 text-xs transition-colors hover:bg-brand/20"
                            >
                              <span className="font-medium">{formatTime(st.startTime)}</span>
                              <span className="text-muted">
                                {st.auditorium.name} · {st.format}
                              </span>
                              <span className="mt-1 text-brand-light">{formatNaira(seatPrice(st.basePrice, "STANDARD"))}+</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
