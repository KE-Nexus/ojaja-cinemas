import "server-only";
import { cookies } from "next/headers";

const BOOKING_SESSION_COOKIE = "ojaja_bsid";

/** Anonymous per-browser session id used to attribute seat locks before checkout. Set by middleware on /booking/*. */
export async function getBookingSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(BOOKING_SESSION_COOKIE)?.value;
  if (existing) return existing;
  // Fallback (e.g. direct navigation the middleware didn't see yet).
  return "fallback-session";
}
