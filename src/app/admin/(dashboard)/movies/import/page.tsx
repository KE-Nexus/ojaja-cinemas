import Link from "next/link";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isTmdbConfigured, searchMovies, fetchPopular } from "@/lib/tmdb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImportMovieControl } from "@/components/admin/import-movie-control";
import { SyncMoviesButton } from "@/components/admin/sync-movies-button";

export default async function ImportMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = q?.trim() ?? "";
  const pageNum = Math.max(1, Number(page) || 1);

  if (!isTmdbConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Import Movies</h1>
        <p className="max-w-lg text-sm text-muted">
          Set a <code className="rounded bg-surface-2 px-1.5 py-0.5">TMDB_API_KEY</code> in your environment to search
          and import real movies from The Movie Database.
        </p>
      </div>
    );
  }

  const { results, totalPages } = query ? await searchMovies(query, pageNum) : await fetchPopular(pageNum);

  const existingMovies = await prisma.movie.findMany({
    where: { tmdbId: { in: results.map((r) => r.tmdbId) } },
    select: { id: true, tmdbId: true },
  });
  const existingByTmdbId = new Map(existingMovies.map((m) => [m.tmdbId, m.id]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Movies</h1>
          <p className="text-sm text-muted">Search TMDB for new or classic titles, or keep the catalog current automatically.</p>
        </div>
        <SyncMoviesButton />
      </div>

      <form method="get" className="mb-6 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Search any movie, old or new..." className="pl-9" />
        </div>
        <Button type="submit" size="md">
          Search
        </Button>
      </form>

      {results.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          {query ? `No TMDB results for "${query}".` : "No movies to show."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((m) => {
            const releaseDate = m.releaseDate ? new Date(m.releaseDate) : null;
            const year = releaseDate ? releaseDate.getFullYear() : "TBA";
            const defaultStatus = releaseDate && releaseDate <= today ? "NOW_SHOWING" : "COMING_SOON";

            return (
              <div key={m.tmdbId} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {m.posterUrl && <Image src={m.posterUrl} alt={m.title} fill className="object-cover" sizes="80px" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>{year}</span>
                    <span className="flex items-center gap-0.5">
                      <Star size={11} className="fill-accent-gold text-accent-gold" /> {m.voteAverage.toFixed(1)}
                    </span>
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-xs text-muted">{m.overview}</p>
                  <div className="mt-auto pt-2">
                    <ImportMovieControl
                      tmdbId={m.tmdbId}
                      defaultStatus={defaultStatus}
                      existingMovieId={existingByTmdbId.get(m.tmdbId)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-3 text-sm">
        {pageNum > 1 && (
          <Link
            href={`/admin/movies/import?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(pageNum - 1) })}`}
            className="text-brand-light hover:underline"
          >
            Previous
          </Link>
        )}
        <span className="text-muted">
          Page {pageNum} of {Math.max(1, totalPages)}
        </span>
        {pageNum < totalPages && (
          <Link
            href={`/admin/movies/import?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(pageNum + 1) })}`}
            className="text-brand-light hover:underline"
          >
            Next
          </Link>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Can&rsquo;t find it on TMDB?{" "}
        <Link href="/admin/movies/new" className="text-brand-light hover:underline">
          Add a movie manually
        </Link>
        .
      </p>
    </div>
  );
}
