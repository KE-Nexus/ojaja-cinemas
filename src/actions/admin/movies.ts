"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { movieSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return `"${file.name}" isn't an image file.`;
  if (file.size > MAX_IMAGE_BYTES) return `"${file.name}" is larger than 4MB.`;
  return null;
}

function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith("video/")) return `"${file.name}" isn't a video file.`;
  if (file.size > MAX_VIDEO_BYTES) return `"${file.name}" is larger than 25MB.`;
  return null;
}

/** Trailer is either a pasted YouTube embed URL or an uploaded clip (stored as a data URI, same field). */
async function resolveTrailerUrl(formData: FormData, existingUrl: string | null): Promise<{ error: string | null; url: string | null }> {
  const mode = formData.get("trailerMode") === "upload" ? "upload" : "youtube";

  if (mode === "youtube") {
    const raw = String(formData.get("trailerUrl") ?? "").trim();
    if (!raw) return { error: null, url: null };
    try {
      new URL(raw);
    } catch {
      return { error: "Enter a valid trailer URL.", url: null };
    }
    return { error: null, url: raw };
  }

  const file = formData.get("trailerVideo");
  if (!(file instanceof File) || file.size === 0) {
    // Switched to "Upload Video" without picking a file — leave whatever was already saved.
    return { error: null, url: existingUrl };
  }
  const videoError = validateVideoFile(file);
  if (videoError) return { error: videoError, url: null };
  return { error: null, url: await fileToDataUrl(file) };
}

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
    genres: formData.get("genres"),
    classification: formData.get("classification"),
    language: formData.get("language"),
    runtimeMins: formData.get("runtimeMins"),
    cast: formData.get("cast"),
    director: formData.get("director") || "",
    distributor: formData.get("distributor") || "",
    releaseDate: formData.get("releaseDate"),
    status: formData.get("status"),
  });
}

export async function createMovieAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "ACCOUNTANT"]);
  const parsed = parseMovieForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const posterFile = formData.get("poster");
  if (!(posterFile instanceof File) || posterFile.size === 0) return { error: "Upload a poster image." };
  const posterError = validateImageFile(posterFile);
  if (posterError) return { error: posterError };
  const posterUrl = await fileToDataUrl(posterFile);

  const backdropFile = formData.get("backdrop");
  let backdropUrl: string | null = null;
  if (backdropFile instanceof File && backdropFile.size > 0) {
    const backdropError = validateImageFile(backdropFile);
    if (backdropError) return { error: backdropError };
    backdropUrl = await fileToDataUrl(backdropFile);
  }

  const trailer = await resolveTrailerUrl(formData, null);
  if (trailer.error) return { error: trailer.error };

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
      posterUrl,
      backdropUrl,
      trailerUrl: trailer.url,
      director: parsed.data.director || null,
      distributor: parsed.data.distributor || null,
      releaseDate: new Date(parsed.data.releaseDate),
    },
  });

  await logAdminAction(session.sub, "CREATE", "Movie", movie.id, { title: movie.title });
  revalidatePath("/admin/movies");
  redirect("/admin/movies");
}

export async function updateMovieAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "ACCOUNTANT"]);
  const id = String(formData.get("id"));
  const existing = await prisma.movie.findUnique({ where: { id } });
  if (!existing) return { error: "Movie not found." };

  const parsed = parseMovieForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  let posterUrl = existing.posterUrl;
  const posterFile = formData.get("poster");
  if (posterFile instanceof File && posterFile.size > 0) {
    const posterError = validateImageFile(posterFile);
    if (posterError) return { error: posterError };
    posterUrl = await fileToDataUrl(posterFile);
  }

  let backdropUrl = existing.backdropUrl;
  const backdropFile = formData.get("backdrop");
  if (backdropFile instanceof File && backdropFile.size > 0) {
    const backdropError = validateImageFile(backdropFile);
    if (backdropError) return { error: backdropError };
    backdropUrl = await fileToDataUrl(backdropFile);
  }

  const trailer = await resolveTrailerUrl(formData, existing.trailerUrl);
  if (trailer.error) return { error: trailer.error };

  await prisma.movie.update({
    where: { id },
    data: {
      ...parsed.data,
      posterUrl,
      backdropUrl,
      trailerUrl: trailer.url,
      director: parsed.data.director || null,
      distributor: parsed.data.distributor || null,
      releaseDate: new Date(parsed.data.releaseDate),
    },
  });

  await logAdminAction(session.sub, "UPDATE", "Movie", id, { title: parsed.data.title });
  revalidatePath("/admin/movies");
  redirect("/admin/movies");
}

export async function deleteMovieAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  await prisma.movie.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Movie", id);
  revalidatePath("/admin/movies");
}
