import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { type MovieCardData } from "@/components/movie-card";
import { MovieDetailCard, type MovieShowtimeHint } from "@/components/movie-detail-card";
import { HeroCarousel, type HeroMovie } from "@/components/hero-carousel";
import { CategoryPills } from "@/components/category-pills";
import { SiteDayStrip } from "@/components/site-day-strip";
import { SiteLocationSelect } from "@/components/site-location-select";
import { Input } from "@/components/ui/input";
import { withRatings } from "@/lib/ratings";
import { nowShowingWhere, comingSoonWhere } from "@/lib/movie-availability";
import { getSelectedLocationId } from "@/lib/location-session";
import { formatTime } from "@/lib/format";
import type { Movie } from "@prisma/client";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse now showing and coming soon movies at OJAJA Cinemas.",
};

function startOfDay(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDayFromDateString(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

function ordinalSuffix(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return "st";
  if (n % 10 === 2 && n % 100 !== 12) return "nd";
  if (n % 10 === 3 && n % 100 !== 13) return "rd";
  return "th";
}

function dayStripLabel(d: Date) {
  const month = d.toLocaleDateString("en-NG", { month: "short" }).toUpperCase();
  return `${month} ${d.getDate()}${ordinalSuffix(d.getDate())}`;
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; genre?: string; day?: string; date?: string; location?: string }>;
}) {
  const { status, q, genre, day, date, location } = await searchParams;
  const isBrowsing = !status && !q && !genre;

  // No explicit choice yet (first visit) — default to the guest's selected cinema.
  // An explicit empty string means they deliberately picked "All Cinemas".
  const locationId = location === undefined ? await getSelectedLocationId() : location || null;

  const dayRange = date
    ? { gte: startOfDayFromDateString(date), lt: new Date(startOfDayFromDateString(date).getTime() + 24 * 60 * 60 * 1000) }
    : { gte: startOfDay(Number(day ?? 0)), lt: startOfDay(Number(day ?? 0) + 1) };

  const [nowShowingRaw, comingSoonRaw, branches] = await Promise.all([
    prisma.movie.findMany({ where: nowShowingWhere(locationId, dayRange), orderBy: { releaseDate: "desc" } }),
    prisma.movie.findMany({ where: comingSoonWhere(locationId), orderBy: { releaseDate: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  const dayShowtimes =
    status !== "coming-soon" && nowShowingRaw.length > 0
      ? await prisma.showtime.findMany({
          where: {
            movieId: { in: nowShowingRaw.map((m) => m.id) },
            startTime: dayRange,
            status: "OPEN",
            salesOnWeb: true,
            ...(locationId ? { auditorium: { branchId: locationId } } : {}),
          },
          include: { movie: true, auditorium: { include: { branch: true } } },
          orderBy: { startTime: "asc" },
        })
      : [];

  const availableMovies = [...nowShowingRaw, ...comingSoonRaw];

  const genreCounts = new Map<string, number>();
  for (const m of availableMovies) {
    const primary = m.genres.split(",")[0]?.trim();
    if (!primary) continue;
    genreCounts.set(primary, (genreCounts.get(primary) ?? 0) + 1);
  }
  const categories = Array.from(genreCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  let filtered: Movie[] = availableMovies;
  if (status === "now-showing") filtered = nowShowingRaw;
  else if (status === "coming-soon") filtered = comingSoonRaw;

  if (genre) {
    const genreLower = genre.toLowerCase();
    filtered = filtered.filter((m) => m.genres.toLowerCase().includes(genreLower));
  }
  if (q) {
    const qLower = q.toLowerCase();
    filtered = filtered.filter(
      (m) => m.title.toLowerCase().includes(qLower) || m.genres.toLowerCase().includes(qLower) || m.cast.toLowerCase().includes(qLower)
    );
  }

  const movies: MovieCardData[] = await withRatings(filtered);
  const heroMovies: HeroMovie[] = (await withRatings(nowShowingRaw.slice(0, 5))).map((m) => ({
    slug: m.slug,
    title: m.title,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    genres: m.genres,
    runtimeMins: m.runtimeMins,
    classification: m.classification,
    synopsis: m.synopsis,
    rating: m.rating,
    reviewCount: m.reviewCount,
  }));

  const byMovieShowtimes = new Map<string, typeof dayShowtimes>();
  for (const st of dayShowtimes) {
    const list = byMovieShowtimes.get(st.movie.id) ?? [];
    list.push(st);
    byMovieShowtimes.set(st.movie.id, list);
  }

  // Keyed by slug (not id) so it lines up with MovieCardData, which doesn't carry the DB id.
  const earliestShowtimeBySlug = new Map<string, MovieShowtimeHint>();
  for (const list of byMovieShowtimes.values()) {
    const earliest = list[0];
    earliestShowtimeBySlug.set(earliest.movie.slug, {
      time: formatTime(earliest.startTime),
      label: `${earliest.auditorium.name} · ${earliest.format}`,
      href: `/booking/${earliest.id}/seats`,
    });
  }

  // Split so movies you can actually book right now don't sit interleaved with ones you
  // can't yet (e.g. Coming Soon titles surfaced under the "All" filter).
  const scheduledMovies = movies.filter((m) => earliestShowtimeBySlug.has(m.slug));
  const unscheduledMovies = movies.filter((m) => !earliestShowtimeBySlug.has(m.slug));

  function buildHref(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    // undefined means "omit" (let the next page fall back to its own default, e.g. the
    // location cookie); an explicit empty string (e.g. "All Cinemas") is preserved as-is.
    for (const [k, v] of Object.entries(params)) if (v !== undefined) sp.set(k, v);
    const qs = sp.toString();
    return qs ? `/movies?${qs}` : "/movies";
  }

  const activeDayOffset = date ? -1 : Number(day ?? 0);
  const dayOptions = Array.from({ length: 7 }, (_, i) => ({
    key: String(i),
    label: dayStripLabel(startOfDay(i)),
    href: buildHref({ status, q, genre, location, day: String(i) }),
    active: activeDayOffset === i,
  }));

  const selectedDayLabel =
    activeDayOffset === 0
      ? "today"
      : activeDayOffset === 1
        ? "tomorrow"
        : `on ${dayRange.gte.toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" })}`;

  return (
    <div className="pb-8">
      {isBrowsing && heroMovies.length > 0 && <HeroCarousel movies={heroMovies} />}

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-10">
        <h1 className="text-3xl font-bold tracking-tight">Movies</h1>
        {locationId && (
          <p className="mt-1 text-sm text-muted">Now Showing reflects what&rsquo;s actually playing at your selected cinema.</p>
        )}

        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
          <Input type="search" name="q" defaultValue={q ?? ""} placeholder="Search by title, genre, or actor..." className="sm:max-w-sm" />
          <div className="flex gap-2 text-sm">
            <FilterLink href={buildHref({ q, genre, location, day, date })} active={!status} label="All" />
            <FilterLink href={buildHref({ status: "now-showing", q, genre, location, day, date })} active={status === "now-showing"} label="Now Showing" />
            <FilterLink href={buildHref({ status: "coming-soon", q, genre, location })} active={status === "coming-soon"} label="Coming Soon" />
          </div>
        </form>

        {status !== "coming-soon" && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <SiteDayStrip days={dayOptions} basePath="/movies" dateActive={Boolean(date)} />
            </div>
            <SiteLocationSelect branches={branches.map((b) => ({ id: b.id, name: b.name }))} selected={locationId ?? ""} basePath="/movies" />
          </div>
        )}

        {status !== "coming-soon" && nowShowingRaw.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">No movies showing {selectedDayLabel} yet</p>
            <p className="mt-2 text-sm text-muted">Try a different day{locationId ? " or cinema" : ""} using the filters above.</p>
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Categories</h2>
            <CategoryPills categories={categories} activeGenre={genre} />
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <p className="mx-auto mt-16 max-w-7xl px-4 text-center text-muted sm:px-6 lg:px-10">
          No movies matched your search{locationId ? " at your selected cinema" : ""}.
        </p>
      ) : (
        <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6 lg:px-10">
          {scheduledMovies.length > 0 && (
            <div>
              {unscheduledMovies.length > 0 && <h2 className="mb-3 text-lg font-bold tracking-tight">Showing Now</h2>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {scheduledMovies.map((movie) => (
                  <MovieDetailCard key={movie.slug} movie={movie} showtime={earliestShowtimeBySlug.get(movie.slug) ?? null} />
                ))}
              </div>
            </div>
          )}

          {unscheduledMovies.length > 0 && (
            <div className={scheduledMovies.length > 0 ? "mt-10" : undefined}>
              {scheduledMovies.length > 0 && <h2 className="mb-3 text-lg font-bold tracking-tight">Coming Soon</h2>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {unscheduledMovies.map((movie) => (
                  <MovieDetailCard key={movie.slug} movie={movie} showtime={null} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <a
      href={href}
      className={`rounded-lg border px-3 py-2 font-medium transition-colors ${
        active ? "border-brand bg-brand/15 text-brand-light" : "border-border text-muted hover:border-brand-light"
      }`}
    >
      {label}
    </a>
  );
}
