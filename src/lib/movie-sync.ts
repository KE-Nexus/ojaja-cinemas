import "server-only";
import { prisma } from "@/lib/prisma";
import { fetchMovieDetail, fetchNowPlaying, fetchUpcoming, type ImportedMovie } from "@/lib/every-film";
import type { MovieStatus } from "@prisma/client";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || "movie";
  let slug = base;
  let n = 1;
  while (await prisma.movie.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

function placeholderPoster(seed: string) {
  return `https://picsum.photos/seed/${seed}/600/900`;
}

/** A Coming Soon import whose release date has already passed reads as "now showing," not auto-detected. */
function autoStatus(releaseDate: string): "NOW_SHOWING" | "COMING_SOON" {
  return new Date(releaseDate) <= new Date() ? "NOW_SHOWING" : "COMING_SOON";
}

function toMovieData(detail: ImportedMovie, slug: string, status: MovieStatus) {
  return {
    everyFilmId: detail.everyFilmId,
    slug,
    title: detail.title,
    synopsis: detail.synopsis,
    posterUrl: detail.posterUrl || placeholderPoster(slug),
    backdropUrl: detail.backdropUrl,
    trailerUrl: detail.trailerUrl,
    genres: detail.genres,
    classification: detail.classification,
    language: detail.language,
    runtimeMins: detail.runtimeMins,
    cast: detail.cast,
    director: detail.director,
    distributorId: null,
    releaseDate: new Date(detail.releaseDate),
    status,
  };
}

/** Import (or refresh) a single every.film title into the catalog. Idempotent on everyFilmId. */
export async function importMovieByEveryFilmId(everyFilmId: string, status?: "NOW_SHOWING" | "COMING_SOON") {
  const detail = await fetchMovieDetail(everyFilmId);
  const resolvedStatus = status ?? autoStatus(detail.releaseDate);

  // Prefer a match on everyFilmId, but fall back to an untagged row with the same title —
  // e.g. movies added before this field existed, or hand-entered titles that happen to
  // match an every.film release. Without this, importing/syncing would create a duplicate
  // catalog entry instead of enriching (and preserving the showtimes/reviews of) the one
  // that's already there.
  const existing =
    (await prisma.movie.findUnique({ where: { everyFilmId } })) ??
    (await prisma.movie.findFirst({ where: { everyFilmId: null, title: detail.title } }));

  if (existing) {
    const movie = await prisma.movie.update({
      where: { id: existing.id },
      data: toMovieData(detail, existing.slug, resolvedStatus),
    });
    return { movie, created: false };
  }

  const slug = await uniqueSlug(detail.title);
  const movie = await prisma.movie.create({ data: toMovieData(detail, slug, resolvedStatus) });
  return { movie, created: true };
}

export type SyncSummary = { imported: number; updated: number; flipped: number };

/**
 * Keeps the catalog current: pulls every.film's now-playing/upcoming lists and upserts them
 * (by everyFilmId), then flips any previously-imported Coming Soon title to Now Showing once
 * its release date has passed — even if every.film has since rotated it out of "upcoming."
 */
export async function syncLatestMovies(): Promise<SyncSummary> {
  const [nowPlaying, upcomingRaw] = await Promise.all([fetchNowPlaying(15), fetchUpcoming(16)]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = upcomingRaw.filter((m) => new Date(m.releaseDate) >= today).slice(0, 10);

  let imported = 0;
  let updated = 0;

  for (const detail of nowPlaying) {
    const { created } = await importMovieByEveryFilmId(detail.everyFilmId, "NOW_SHOWING");
    if (created) imported++;
    else updated++;
  }
  for (const detail of upcoming) {
    const { created } = await importMovieByEveryFilmId(detail.everyFilmId, "COMING_SOON");
    if (created) imported++;
    else updated++;
  }

  const { count: flipped } = await prisma.movie.updateMany({
    where: { status: "COMING_SOON", releaseDate: { lte: new Date() } },
    data: { status: "NOW_SHOWING" },
  });

  return { imported, updated, flipped };
}
