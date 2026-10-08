import { NextResponse } from "next/server";
import { syncLatestMovies } from "@/lib/movie-sync";

/**
 * Auto-updates the catalog with every.film's current now-playing/upcoming titles and flips
 * stale Coming Soon entries to Now Showing once their release date has passed.
 *
 * Not wired to a scheduler by itself — point any external cron (Vercel Cron, a Windows
 * Task Scheduler job, cron-job.org, etc.) at this URL on an interval (e.g. every 6h).
 * Set CRON_SECRET and send it as `Authorization: Bearer <secret>` to restrict access.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const summary = await syncLatestMovies();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "every.film is unreachable." }, { status: 502 });
  }
}
