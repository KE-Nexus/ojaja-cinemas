import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * "Now Showing" scoped to what actually has an upcoming showtime at the given
 * branch — so guests only ever see movies they can actually book at their
 * selected cinema. Coming Soon titles have no showtimes yet, so they're never
 * location-filtered (there's nothing to be "available" against).
 *
 * `dayRange` narrows this further to "has a showtime on this specific day" —
 * used by the day-strip filter on the Movies page. Omitting it falls back to
 * "any upcoming showtime at all", the original browse-everything behavior.
 */
export function nowShowingWhere(locationId: string | null, dayRange?: { gte: Date; lt: Date }): Prisma.MovieWhereInput {
  if (!locationId && !dayRange) return { status: "NOW_SHOWING" };

  return {
    status: "NOW_SHOWING",
    showtimes: {
      some: {
        startTime: dayRange ?? { gte: new Date() },
        status: "OPEN",
        salesOnWeb: true,
        ...(locationId ? { auditorium: { branchId: locationId } } : {}),
      },
    },
  };
}
