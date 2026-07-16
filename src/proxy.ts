import { NextResponse, type NextRequest } from "next/server";

const BOOKING_SESSION_COOKIE = "ojaja_bsid";

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(BOOKING_SESSION_COOKIE);
  const sessionId = existing?.value ?? crypto.randomUUID();

  if (!existing) {
    // Mutate the request's cookie jar (backed by its headers) so this same
    // request can already read the new id via cookies() during rendering.
    request.cookies.set(BOOKING_SESSION_COOKIE, sessionId);
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  if (!existing) {
    response.cookies.set(BOOKING_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  return response;
}

export const config = {
  matcher: "/booking/:path*",
};
