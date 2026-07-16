"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reviewSchema } from "@/lib/validation";

export type ReviewFormState = { error?: string; success?: boolean } | null;

export async function submitReviewAction(_prev: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const session = await getSession();
  if (!session) return { error: "Please log in to leave a review." };

  const parsed = reviewSchema.safeParse({
    movieId: formData.get("movieId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid review." };

  const movie = await prisma.movie.findUnique({ where: { id: parsed.data.movieId } });
  if (!movie) return { error: "Movie not found." };

  await prisma.review.create({
    data: {
      movieId: parsed.data.movieId,
      userId: session.sub,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      status: "PENDING",
    },
  });

  revalidatePath(`/movies/${movie.slug}`);
  return { success: true };
}
