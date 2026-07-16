import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/rating-stars";
import { ReviewForm } from "@/components/review-form";
import { formatDate, formatNaira, formatRuntime, formatTime } from "@/lib/format";
import { seatPrice } from "@/lib/booking";
import { Play, Info, Star } from "lucide-react";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const movie = await prisma.movie.findUnique({ where: { slug } });
  if (!movie) return {};
  return {
    title: movie.title,
    description: movie.synopsis,
    openGraph: { title: movie.title, description: movie.synopsis, images: [movie.posterUrl] },
  };
}

export default async function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await prisma.movie.findUnique({ where: { slug } });
  if (!movie) notFound();

  const [showtimes, reviews, session] = await Promise.all([
    prisma.showtime.findMany({
      where: { movieId: movie.id, startTime: { gte: new Date() } },
      include: { auditorium: { include: { branch: true } } },
      orderBy: { startTime: "asc" },
      take: 60,
    }),
    prisma.review.findMany({
      where: { movieId: movie.id, status: "APPROVED" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getSession(),
  ]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const byBranch = new Map<string, typeof showtimes>();
  for (const st of showtimes) {
    const key = st.auditorium.branch.name;
    const list = byBranch.get(key) ?? [];
    list.push(st);
    byBranch.set(key, list);
  }

  const youtubeId = movie.trailerUrl?.split("/embed/")[1];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.synopsis,
    image: movie.posterUrl,
    dateCreated: movie.releaseDate.toISOString(),
    genre: movie.genres.split(",").map((g) => g.trim()),
    duration: `PT${movie.runtimeMins}M`,
    contentRating: movie.classification,
    ...(reviews.length > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: reviews.length } }
      : {}),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative flex h-[70vh] max-h-[720px] min-h-[440px] items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image src={movie.backdropUrl ?? movie.posterUrl} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/10 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-4 pb-12 sm:px-6 sm:pb-16 lg:px-10">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{movie.classification}</Badge>
              <Badge tone={movie.status === "NOW_SHOWING" ? "success" : "gold"}>
                {movie.status === "NOW_SHOWING" ? "Now Showing" : "Coming Soon"}
              </Badge>
              {reviews.length > 0 && (
                <Badge tone="gold">
                  <Star size={11} className="fill-accent-gold" /> {avgRating.toFixed(1)} ({reviews.length})
                </Badge>
              )}
            </div>
            <h1 className="font-display text-glow text-4xl tracking-wide sm:text-6xl">{movie.title}</h1>
            <p className="mt-3 text-sm text-muted sm:text-base">
              {movie.genres} · {formatRuntime(movie.runtimeMins)} · {movie.language} · {formatDate(movie.releaseDate)}
            </p>
            <p className="mt-4 line-clamp-3 max-w-xl text-foreground/85">{movie.synopsis}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#showtimes"
                className="flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Play size={18} className="fill-black" /> Book Now
              </Link>
              {youtubeId && (
                <Link
                  href="#trailer"
                  className="flex items-center gap-2 rounded-md bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <Info size={18} /> Watch Trailer
                </Link>
              )}
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Director</dt>
                <dd>{movie.director ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Cast</dt>
                <dd className="line-clamp-2">{movie.cast}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {youtubeId && (
        <section id="trailer" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Trailer</h2>
          <div className="aspect-video overflow-hidden rounded-md">
            <iframe
              className="h-full w-full"
              src={movie.trailerUrl ?? undefined}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section id="showtimes" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-4 sm:px-6 lg:px-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Showtimes</h2>
        {byBranch.size === 0 ? (
          <p className="text-muted">No upcoming showtimes scheduled yet — check back soon.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(byBranch.entries()).map(([branchName, list]) => (
              <div key={branchName} className="rounded-lg bg-surface p-5">
                <h3 className="mb-3 font-semibold">{branchName}</h3>
                <div className="flex flex-wrap gap-2">
                  {list.map((st) => (
                    <Link
                      key={st.id}
                      href={`/booking/${st.id}/seats`}
                      className="flex flex-col items-center rounded-md bg-surface-2 px-3 py-2 text-xs transition-colors hover:bg-brand/20"
                    >
                      <span className="font-medium">{formatTime(st.startTime)}</span>
                      <span className="text-muted">{formatDate(st.startTime).split(",")[0]}</span>
                      <span className="mt-1 text-brand-light">{formatNaira(seatPrice(st.basePrice, "STANDARD"))}+</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-10">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Reviews</h2>

        {session ? (
          <div className="mb-8">
            <ReviewForm movieId={movie.id} />
          </div>
        ) : (
          <p className="mb-8 text-sm text-muted">
            <Link href="/login" className="text-brand-light hover:underline">
              Log in
            </Link>{" "}
            to leave a review.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-muted">No reviews yet — be the first to share your thoughts.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg bg-surface p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="font-medium">{r.user.name}</span>
                  <RatingStars rating={r.rating} size={14} />
                </div>
                <p className="text-sm text-foreground/85">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pb-16" />
    </div>
  );
}
