import Link from "next/link";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { searchMovies, fetchPopular } from "@/lib/every-film";
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

  let results: Awaited<ReturnType<typeof searchMovies>>["results"] = [];
  let totalPages = 1;
  let providerError: string | null = null;
  try {
    const data = query ? await searchMovies(query, pageNum) : await fetchPopular(pageNum);
    results = data.results;
    totalPages = data.totalPages;
  } catch (err) {
    providerError = err instanceof Error ? err.message : "every.film is currently unreachable.";
  }

  const existingMovies = providerError
    ? []
    : await prisma.movie.findMany({
        where: { everyFilmId: { in: results.map((r) => r.everyFilmId) } },
        select: { id: true, everyFilmId: true },
      });
  const existingByEveryFilmId = new Map(existingMovies.map((m) => [m.everyFilmId, m.id]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (providerError) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Import Movies</h1>
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 p-6">
          <p className="font-semibold text-danger">every.film is currently unavailable</p>
          <p className="mt-1 text-sm text-muted">
            The movie data provider isn&rsquo;t responding right now ({providerError}). This is an outage on their end, not
            something wrong with your catalog — try again later, or{" "}
            <Link href="/admin/movies/new" className="text-brand-light hover:underline">
              add this movie manually
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import Movies</h1>
          <p className="text-sm text-muted">Search every.film for new or classic titles, or keep the catalog current automatically.</p>
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
          {query ? `No results for "${query}".` : "No movies to show."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((m) => {
            const releaseDate = m.releaseDate ? new Date(m.releaseDate) : null;
            const year = releaseDate ? releaseDate.getFullYear() : "TBA";
            const defaultStatus = releaseDate && releaseDate <= today ? "NOW_SHOWING" : "COMING_SOON";

            return (
              <div key={m.everyFilmId} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {m.posterUrl && <Image src={m.posterUrl} alt={m.title} fill unoptimized referrerPolicy="no-referrer" className="object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>{year}</span>
                    <span className="flex items-center gap-0.5">
                      <Star size={11} className="fill-accent-gold text-accent-gold" /> {m.voteAverage.toFixed(1)}
                    </span>
                  </p>
                  <div className="mt-auto pt-2">
                    <ImportMovieControl
                      everyFilmId={m.everyFilmId}
                      defaultStatus={defaultStatus}
                      existingMovieId={existingByEveryFilmId.get(m.everyFilmId)}
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
        Can&rsquo;t find it?{" "}
        <Link href="/admin/movies/new" className="text-brand-light hover:underline">
          Add a movie manually
        </Link>
        .
      </p>
    </div>
  );
}
