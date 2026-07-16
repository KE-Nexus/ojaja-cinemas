const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function isTmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_API_KEY);
}

function imageUrl(path: string | null, size: "w500" | "w780" | "original" = "w500"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY is not set");

  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB request failed (${res.status}): ${path}`);
  return res.json() as Promise<T>;
}

type TmdbListResult = {
  results: { id: number }[];
};

type TmdbSearchResult = {
  page: number;
  total_pages: number;
  results: {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string | null;
    vote_average: number;
  }[];
};

export type MovieSearchResult = {
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
};

type TmdbGenre = { id: number; name: string };

type TmdbMovieDetail = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: TmdbGenre[];
  runtime: number | null;
  original_language: string;
  release_date: string;
  credits?: {
    cast: { name: string }[];
    crew: { name: string; job: string }[];
  };
  videos?: {
    results: { site: string; type: string; key: string }[];
  };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string; release_date: string; type: number }[] }[];
  };
};

export type ImportedMovie = {
  tmdbId: number;
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
  releaseDate: string;
};

function mapMovieDetail(detail: TmdbMovieDetail): ImportedMovie {
  const usReleaseDates = detail.release_dates?.results?.find((r) => r.iso_3166_1 === "US")?.release_dates;

  const usCertification = usReleaseDates?.map((rd) => rd.certification).find((c) => c);

  // TMDB's /movie/upcoming list is filtered by regional release windows, but the top-level
  // `release_date` field is always the movie's original/global release date — for re-releases
  // (anniversary screenings, etc.) that can be decades in the past. Prefer the latest US
  // theatrical (type 2/3) date, which reflects the release TMDB is actually surfacing.
  const usTheatricalDate = usReleaseDates
    ?.filter((rd) => rd.type === 2 || rd.type === 3)
    .map((rd) => rd.release_date)
    .filter(Boolean)
    .sort()
    .pop();

  const trailer = detail.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer");
  const director = detail.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;
  const cast = detail.credits?.cast?.slice(0, 5).map((c) => c.name) ?? [];

  return {
    tmdbId: detail.id,
    title: detail.title,
    synopsis: detail.overview || "Synopsis not available.",
    posterUrl: imageUrl(detail.poster_path, "w500") ?? "",
    backdropUrl: imageUrl(detail.backdrop_path, "w780"),
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null,
    genres: detail.genres.map((g) => g.name).join(", ") || "Drama",
    classification: usCertification || "NR",
    language: detail.original_language.toUpperCase(),
    runtimeMins: detail.runtime || 110,
    cast: cast.join(", ") || "Cast unavailable",
    director,
    releaseDate: usTheatricalDate || detail.release_date,
  };
}

export async function fetchMovieDetail(id: number): Promise<ImportedMovie> {
  const detail = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
    append_to_response: "credits,videos,release_dates",
  });
  return mapMovieDetail(detail);
}

/** Lightweight title search across TMDB's full catalog (new releases and decades-old titles alike). */
export async function searchMovies(query: string, page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  const data = await tmdbFetch<TmdbSearchResult>("/search/movie", {
    query,
    page: String(page),
    include_adult: "false",
  });
  return {
    results: data.results.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      overview: m.overview || "Synopsis not available.",
      posterUrl: imageUrl(m.poster_path, "w500"),
      releaseDate: m.release_date || null,
      voteAverage: m.vote_average,
    })),
    totalPages: data.total_pages,
  };
}

/** Lightweight "currently popular" browse list, used as the Import Movies default view. */
export async function fetchPopular(page = 1): Promise<{ results: MovieSearchResult[]; totalPages: number }> {
  const data = await tmdbFetch<TmdbSearchResult>("/movie/popular", { page: String(page) });
  return {
    results: data.results.map((m) => ({
      tmdbId: m.id,
      title: m.title,
      overview: m.overview || "Synopsis not available.",
      posterUrl: imageUrl(m.poster_path, "w500"),
      releaseDate: m.release_date || null,
      voteAverage: m.vote_average,
    })),
    totalPages: data.total_pages,
  };
}

/** Real now-playing titles, enriched with runtime/cast/trailer (extra detail calls, one per movie). */
export async function fetchNowPlaying(limit = 10): Promise<ImportedMovie[]> {
  const list = await tmdbFetch<TmdbListResult>("/movie/now_playing", { page: "1", region: "US" });
  const ids = list.results.slice(0, limit).map((m) => m.id);
  return Promise.all(ids.map(fetchMovieDetail));
}

/** Real upcoming titles, enriched the same way. */
export async function fetchUpcoming(limit = 8): Promise<ImportedMovie[]> {
  const list = await tmdbFetch<TmdbListResult>("/movie/upcoming", { page: "1", region: "US" });
  const ids = list.results.slice(0, limit).map((m) => m.id);
  return Promise.all(ids.map(fetchMovieDetail));
}
