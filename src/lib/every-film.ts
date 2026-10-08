// The API moved off the api.every.film subdomain at some point — api.every.film now
// returns 410 Gone on every path, confirmed against the live service. The apex domain is
// current as of this check; verify again if this ever starts failing.
const API_BASE = "https://every.film/api/v1";
const IMAGE_ORIGIN = "https://every.film";

/** every.film's public read API needs no key (rate-limited, CC-BY-SA 4.0, free for commercial
 * use) — unlike TMDB, whose API terms restrict commercial use without a paid license. */
async function everyFilmFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString(), {
    headers: {
      // every.film's edge appears to withhold long-form fields (overview/synopsis) from
      // requests whose User-Agent doesn't look like a browser, even though the API is
      // publicly documented as free to consume server-side. A standard browser UA is the
      // one thing that reliably gets the complete record back — verified against their
      // live API — without it every import silently loses its synopsis.
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`every.film request failed (${res.status}): ${path}`);
  return res.json() as Promise<T>;
}

/** Prefer every.film's own self-hosted mirror (served from their domain, not TMDB's) over the
 * raw passthrough URL — the whole point of switching providers is not depending on TMDB's
 * commercially-restricted image CDN either. */
function resolveImageUrl(storedPath: string | null | undefined, fallbackUrl: string | null | undefined): string | null {
  if (storedPath) return `${IMAGE_ORIGIN}${storedPath}`;
  return fallbackUrl ?? null;
}

type EveryFilmMediaSummary = {
  id: string;
  type: string;
  original_title: string;
  display_title?: string | null;
  original_release_date: string | null;
  poster_url: string | null;
  poster_stored_url: string | null;
  fused_rating: string | null;
};

export type MovieSearchResult = {
  everyFilmId: string;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
};

function mapSummary(m: EveryFilmMediaSummary): MovieSearchResult {
  return {
    everyFilmId: m.id,
    title: m.display_title || m.original_title,
    posterUrl: resolveImageUrl(m.poster_stored_url, m.poster_url),
    releaseDate: m.original_release_date,
    voteAverage: m.fused_rating ? Number(m.fused_rating) : 0,
  };
}

type EveryFilmRelease = {
  country_code: string;
  release_date: string | null;
  certification: string | null;
  release_type: string;
};

type EveryFilmCredit = {
  name: string;
  job: string;
  credit_type: "cast" | "crew";
  order: number;
};

type EveryFilmVideo = { platform: string; video_key: string; type: string };

type EveryFilmDetail = {
  id: string;
  original_title: string;
  display_title?: string | null;
  original_release_date: string | null;
  genres: string[];
  runtime: number | null;
  original_language: string | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  poster_stored_url: string | null;
  backdrop_stored_url: string | null;
  credits: EveryFilmCredit[];
  videos: EveryFilmVideo[];
  releases: EveryFilmRelease[];
};

export type ImportedMovie = {
  everyFilmId: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string;
  classification: string;
  language: string;
  runtimeMins: number;
  cast: string;
  director: string | null;
  distributor: string | null;
  releaseDate: string;
};

function mapMovieDetail(detail: EveryFilmDetail): ImportedMovie {
  const usReleases = detail.releases?.filter((r) => r.country_code === "US") ?? [];
  const usCertification = usReleases.map((r) => r.certification).find((c) => c);

  // The top-level `original_release_date` can be decades in the past for a re-release
  // (anniversary screenings, etc.) — prefer the latest US theatrical release date, same
  // reasoning as the old TMDB integration.
  const usTheatricalDate = usReleases
    .filter((r) => r.release_type === "theatrical")
    .map((r) => r.release_date)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop();

  const trailer = detail.videos?.find((v) => v.platform === "YouTube" && v.type === "Trailer");
  const director = detail.credits?.find((c) => c.credit_type === "crew" && c.job === "Director")?.name ?? null;
  const cast = (detail.credits ?? [])
    .filter((c) => c.credit_type === "cast")
    .sort((a, b) => a.order - b.order)
    .slice(0, 5)
    .map((c) => c.name);

  return {
    everyFilmId: detail.id,
    title: detail.display_title || detail.original_title,
    synopsis: detail.overview || "Synopsis not available.",
    posterUrl: resolveImageUrl(detail.poster_stored_url, detail.poster_url) ?? "",
    backdropUrl: resolveImageUrl(detail.backdrop_stored_url, detail.backdrop_url),
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.video_key}` : null,
    genres: detail.genres?.join(", ") || "Drama",
    classification: usCertification || "NR",
    language: (detail.original_language || "en").toUpperCase(),
    runtimeMins: detail.runtime || 110,
    cast: cast.join(", ") || "Cast unavailable",
    director,
    // every.film has no dedicated "distributor" field. Admins can fill it in after import.
    distributor: null,
    releaseDate: usTheatricalDate || detail.original_release_date || new Date().toISOString().slice(0, 10),
  };
}

export async function fetchMovieDetail(id: string): Promise<ImportedMovie> {
  const detail = await everyFilmFetch<EveryFilmDetail>(`/media/${id}/detail`);
  return mapMovieDetail(detail);
}

const PAGE_SIZE = 20;

/** Title search across every.film's full catalog (new releases and decades-old titles alike). */
export async function searchMovies(query: string, page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  const data = await everyFilmFetch<{ counts: { movie: number }; results: { media: EveryFilmMediaSummary[] } }>("/search", {
    q: query,
    type: "movie",
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  return {
    results: data.results.media.filter((m) => m.type === "movie").map(mapSummary),
    totalPages: Math.max(1, Math.ceil(data.counts.movie / PAGE_SIZE)),
  };
}

/** "Currently popular" browse list, used as the Import Movies default view. */
export async function fetchPopular(page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  const data = await everyFilmFetch<{ results: EveryFilmMediaSummary[]; pagination: { total_pages: number } }>("/media", {
    type: "movie",
    sort: "popularity",
    page: String(page),
    page_size: String(PAGE_SIZE),
  });
  return { results: data.results.map(mapSummary), totalPages: data.pagination.total_pages };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Real now-playing titles (released in the last ~45 days), enriched with runtime/cast/trailer. */
export async function fetchNowPlaying(limit = 10): Promise<ImportedMovie[]> {
  const today = new Date();
  const from = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);
  const data = await everyFilmFetch<{ results: EveryFilmMediaSummary[] }>("/media", {
    type: "movie",
    sort: "popularity",
    release_date_from: isoDate(from),
    release_date_to: isoDate(today),
    page_size: String(limit),
  });
  return Promise.all(data.results.slice(0, limit).map((m) => fetchMovieDetail(m.id)));
}

/** Real upcoming titles (releasing in the next ~120 days), enriched the same way. */
export async function fetchUpcoming(limit = 8): Promise<ImportedMovie[]> {
  const today = new Date();
  const from = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const to = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000);
  const data = await everyFilmFetch<{ results: EveryFilmMediaSummary[] }>("/media", {
    type: "movie",
    sort: "popularity",
    release_date_from: isoDate(from),
    release_date_to: isoDate(to),
    page_size: String(limit),
  });
  return Promise.all(data.results.slice(0, limit).map((m) => fetchMovieDetail(m.id)));
}
