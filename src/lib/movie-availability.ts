import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * "Now Showing" scoped to what actually has an upcoming showtime at the given
 * branch — so guests only ever see movies they can actually book at their
 * selected cinema. Also requires a FilmContract (Branch ↔ Movie) for that branch —
 * the explicit "this cinema is licensed to show this film" record an admin creates
 * under Admin → Movies → Contracts — so a movie only ever appears at locations it
 * was actually added for, not everywhere a stray showtime happens to exist.
 *
 * `dayRange` narrows this further to "has a showtime on this specific day" —
 * used by the day-strip filter on the Movies page. Omitting it falls back to
 * "any upcoming showtime at all", the original browse-everything behavior.
 */
export function nowShowingWhere(locationId: string | null, dayRange?: { gte: Date; lt: Date }): Prisma.MovieWhereInput {
  if (!locationId && !dayRange) return { status: "NOW_SHOWING" };

  return {
    status: "NOW_SHOWING",
    ...(locationId ? { filmContracts: { some: { branchId: locationId } } } : {}),
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

/**
 * Coming Soon titles have no showtimes yet, so a FilmContract is the only signal a
 * branch has actually been assigned this film — without it every location would show
 * the exact same global "coming soon" list regardless of which cinema is selected.
 */
export function comingSoonWhere(locationId: string | null): Prisma.MovieWhereInput {
  return {
    status: "COMING_SOON",
    ...(locationId ? { filmContracts: { some: { branchId: locationId } } } : {}),
  };
}
