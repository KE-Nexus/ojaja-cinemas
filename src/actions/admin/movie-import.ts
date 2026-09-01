"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { importMovieByEveryFilmId, syncLatestMovies, type SyncSummary } from "@/lib/movie-sync";

export async function importMovieAction(everyFilmId: string, status: "NOW_SHOWING" | "COMING_SOON") {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "ACCOUNTANT"]);
  const { movie, created } = await importMovieByEveryFilmId(everyFilmId, status);

  await logAdminAction(session.sub, created ? "CREATE" : "UPDATE", "Movie", movie.id, {
    title: movie.title,
    source: "every-film-import",
  });
  revalidatePath("/admin/movies");
  revalidatePath("/admin/movies/import");
  return { movieId: movie.id, created };
}

export async function syncLatestMoviesAction(): Promise<SyncSummary> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "ACCOUNTANT"]);
  const summary = await syncLatestMovies();

  await logAdminAction(session.sub, "UPDATE", "Movie", "bulk-every-film-sync", summary);
  revalidatePath("/admin/movies");
  revalidatePath("/admin/movies/import");
  return summary;
}
