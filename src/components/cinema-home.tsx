import Link from "next/link";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Play } from "lucide-react";
import { formatRuntime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { nowShowingWhere } from "@/lib/movie-availability";
import type { Branch, BranchImage, Auditorium, Movie } from "@prisma/client";

type CinemaHomeBranch = Branch & { auditoriums: Auditorium[]; images: BranchImage[] };

export function CinemaHome({ branch, scheduledMovies }: { branch: CinemaHomeBranch; scheduledMovies: Movie[] }) {
  const promotionalImages = branch.images.filter((i) => i.kind === "PROMOTIONAL");
  const galleryImages = branch.images.filter((i) => i.kind === "GALLERY");

  return (
    <div>
      <section className="relative overflow-hidden bg-surface">
        {branch.useFilmSchedule && scheduledMovies.length > 0 ? (
          <div className="relative h-72 sm:h-96">
            <Image src={scheduledMovies[0].backdropUrl ?? scheduledMovies[0].posterUrl} alt="" fill unoptimized className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
          </div>
        ) : promotionalImages.length > 0 ? (
          <div className="relative h-72 sm:h-96">
            <Image src={promotionalImages[0].dataUrl} alt="" fill unoptimized className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
          </div>
        ) : (
          <div className="h-40" />
        )}

        <div className="mx-auto -mt-16 max-w-5xl px-4 pb-8 sm:px-6">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{branch.name}</h1>
            <p className="mt-1 text-muted">{branch.city}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="sm:col-span-2">
            {branch.aboutUs && (
              <>
                <h2 className="text-xl font-bold tracking-tight">About</h2>
                <p className="mt-3 whitespace-pre-line text-muted">{branch.aboutUs}</p>
              </>
            )}

            {branch.useFilmSchedule && scheduledMovies.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold tracking-tight">Now Showing Here</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {scheduledMovies.map((m) => (
                    <Link key={m.id} href={`/movies/${m.slug}`} className="group">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-2">
                        <Image src={m.posterUrl} alt={m.title} fill unoptimized className="object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm font-medium">{m.title}</p>
                      <p className="text-xs text-muted">{formatRuntime(m.runtimeMins)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!branch.useFilmSchedule && promotionalImages.length > 0 && (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {promotionalImages.map((img) => (
                  <div key={img.id} className="relative aspect-video overflow-hidden rounded-lg bg-surface-2">
                    <Image src={img.dataUrl} alt="" fill unoptimized className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            {galleryImages.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-bold tracking-tight">Gallery</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                      <Image src={img.dataUrl} alt="" fill unoptimized className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="space-y-3 text-sm text-muted">
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0" /> {branch.address}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={16} className="shrink-0" /> {branch.phone}
                </p>
                {branch.email && (
                  <p className="flex items-center gap-2">
                    <Mail size={16} className="shrink-0" /> {branch.email}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Clock size={16} className="shrink-0" /> {branch.openingHours}
                </p>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted">
                {branch.auditoriums.length} screen{branch.auditoriums.length === 1 ? "" : "s"} ·{" "}
                {branch.auditoriums.map((a) => a.screenType).join(", ")}
              </p>
              <Link
                href={`/movies?location=${branch.id}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-light"
              >
                <Play size={15} className="fill-white" /> Book Tickets Here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getScheduledMoviesForBranch(branch: { id: string; useFilmSchedule: boolean }): Promise<Movie[]> {
  if (!branch.useFilmSchedule) return [];
  return prisma.movie.findMany({
    where: nowShowingWhere(branch.id),
    orderBy: { releaseDate: "desc" },
    take: 6,
  });
}
