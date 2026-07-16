import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * "Now Showing" scoped to what actually has an upcoming showtime at the given
 * branch — so guests only ever see movies they can actually book at their
 * selected cinema. Coming Soon titles have no showtimes yet, so they're never
 * location-filtered (there's nothing to be "available" against).
 */
export function nowShowingWhere(locationId: string | null): Prisma.MovieWhereInput {
  return {
    status: "NOW_SHOWING",
    ...(locationId
      ? {
          showtimes: {
            some: {
              startTime: { gte: new Date() },
              auditorium: { branchId: locationId },
            },
          },
        }
      : {}),
  };
}
