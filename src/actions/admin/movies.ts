"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { movieSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseMovieForm(formData: FormData) {
  return movieSchema.safeParse({
    title: formData.get("title"),
    synopsis: formData.get("synopsis"),
    posterUrl: formData.get("posterUrl"),
    backdropUrl: formData.get("backdropUrl") || "",
    trailerUrl: formData.get("trailerUrl") || "",
    genres: formData.get("genres"),
    classification: formData.get("classification"),
    language: formData.get("language"),
    runtimeMins: formData.get("runtimeMins"),
    cast: formData.get("cast"),
    director: formData.get("director") || "",
    releaseDate: formData.get("releaseDate"),
    status: formData.get("status"),
  });
}

export async function createMovieAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["MANAGER", "ADMIN", "MARKETING"]);
  const parsed = parseMovieForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const baseSlug = slugify(parsed.data.title);
  let slug = baseSlug;
  let n = 1;
  while (await prisma.movie.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++n}`;
  }

  const movie = await prisma.movie.create({
    data: {
      ...parsed.data,
      slug,
      backdropUrl: parsed.data.backdropUrl || null,
      trailerUrl: parsed.data.trailerUrl || null,
      director: parsed.data.director || null,
      releaseDate: new Date(parsed.data.releaseDate),
    },
  });

  await logAdminAction(session.sub, "CREATE", "Movie", movie.id, { title: movie.title });
  revalidatePath("/admin/movies");
  redirect("/admin/movies");
}

export async function updateMovieAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["MANAGER", "ADMIN", "MARKETING"]);
  const id = String(formData.get("id"));
  const parsed = parseMovieForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.movie.update({
    where: { id },
    data: {
      ...parsed.data,
      backdropUrl: parsed.data.backdropUrl || null,
      trailerUrl: parsed.data.trailerUrl || null,
      director: parsed.data.director || null,
      releaseDate: new Date(parsed.data.releaseDate),
    },
  });

  await logAdminAction(session.sub, "UPDATE", "Movie", id, { title: parsed.data.title });
  revalidatePath("/admin/movies");
  redirect("/admin/movies");
}

export async function deleteMovieAction(id: string) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  await prisma.movie.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Movie", id);
  revalidatePath("/admin/movies");
}
