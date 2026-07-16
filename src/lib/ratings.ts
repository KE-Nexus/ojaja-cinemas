import "server-only";
import { prisma } from "@/lib/prisma";

export async function withRatings<T extends { id: string }>(
  movies: T[]
): Promise<(T & { rating: number | null; reviewCount: number })[]> {
  if (movies.length === 0) return [];

  const aggregates = await prisma.review.groupBy({
    by: ["movieId"],
    where: { movieId: { in: movies.map((m) => m.id) }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byMovie = new Map(aggregates.map((a) => [a.movieId, a]));

  return movies.map((m) => ({
    ...m,
    rating: byMovie.get(m.id)?._avg.rating ?? null,
    reviewCount: byMovie.get(m.id)?._count.rating ?? 0,
  }));
}
