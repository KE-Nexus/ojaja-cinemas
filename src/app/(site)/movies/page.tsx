import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { MovieRow } from "@/components/movie-row";
import { HeroCarousel, type HeroMovie } from "@/components/hero-carousel";
import { CategoryPills } from "@/components/category-pills";
import { Input } from "@/components/ui/input";
import { withRatings } from "@/lib/ratings";
import { nowShowingWhere } from "@/lib/movie-availability";
import { getSelectedLocationId } from "@/lib/location-session";
import type { Movie } from "@prisma/client";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse now showing and coming soon movies at OJAJA Cinemas.",
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; genre?: string }>;
}) {
  const { status, q, genre } = await searchParams;
  const isBrowsing = !status && !q && !genre;
  const locationId = await getSelectedLocationId();

  const [nowShowingRaw, comingSoonRaw] = await Promise.all([
    prisma.movie.findMany({ where: nowShowingWhere(locationId), orderBy: { releaseDate: "desc" } }),
    prisma.movie.findMany({ where: { status: "COMING_SOON" }, orderBy: { releaseDate: "asc" } }),
  ]);

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

  const byGenreRow = new Map<string, MovieCardData[]>();
  if (isBrowsing) {
    for (const movie of movies) {
      const primaryGenre = movie.genres.split(",")[0]?.trim();
      if (!primaryGenre) continue;
      const list = byGenreRow.get(primaryGenre) ?? [];
      list.push(movie);
      byGenreRow.set(primaryGenre, list);
    }
  }
  const genreRows = Array.from(byGenreRow.entries()).filter(([, list]) => list.length >= 3);

  // Movies whose primary genre didn't cluster with enough others to earn a row of its
  // own would otherwise vanish from Browse entirely — surface them in a catch-all row
  // instead of silently dropping titles from the page.
  const shownInRows = new Set(genreRows.flatMap(([, list]) => list.map((m) => m.slug)));
  const leftoverMovies = isBrowsing ? movies.filter((m) => !shownInRows.has(m.slug)) : [];

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
            <FilterLink href="/movies" active={!status} label="All" />
            <FilterLink href="/movies?status=now-showing" active={status === "now-showing"} label="Now Showing" />
            <FilterLink href="/movies?status=coming-soon" active={status === "coming-soon"} label="Coming Soon" />
          </div>
        </form>

        {categories.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-lg font-bold tracking-tight">Categories</h2>
            <CategoryPills categories={categories} activeGenre={genre} />
          </div>
        )}
      </div>

      {movies.length === 0 ? (
        <p className="mx-auto mt-16 max-w-7xl px-4 text-center text-muted sm:px-6 lg:px-10">
          No movies matched your search{locationId ? " at your selected cinema" : ""}.
        </p>
      ) : isBrowsing && genreRows.length > 0 ? (
        <div className="mt-6">
          {genreRows.map(([genreName, list]) => (
            <MovieRow key={genreName} title={genreName} movies={list} />
          ))}
          {leftoverMovies.length > 0 && <MovieRow title="More to Watch" movies={leftoverMovies} />}
        </div>
      ) : (
        <div className="mx-auto mt-10 max-w-7xl grid grid-cols-2 gap-x-4 gap-y-8 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-4 lg:px-10 xl:grid-cols-5">
          {movies.map((movie, i) => (
            <MovieCard key={movie.slug} movie={movie} index={i} />
          ))}
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
