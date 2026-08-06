"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRuntime } from "@/lib/format";

export type MovieCardData = {
  slug: string;
  title: string;
  posterUrl: string;
  genres: string;
  classification: string;
  runtimeMins: number;
  status: string;
  synopsis?: string;
  rating?: number | null;
  reviewCount?: number;
  releaseDate?: string | Date;
};

export function MovieCard({
  movie,
  index = 0,
  compact = false,
}: {
  movie: MovieCardData;
  index?: number;
  compact?: boolean;
}) {
  const hasRating = movie.rating !== undefined && movie.rating !== null && (movie.reviewCount ?? 0) > 0;
  const releaseDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
  const releaseDateShort = releaseDate?.toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
  const releaseDateFull = releaseDate?.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.07, zIndex: 30 }}
      className="group relative"
    >
      <Link href={`/movies/${movie.slug}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.6)] transition-shadow duration-300 group-hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.8)]">
          <Image
            src={movie.posterUrl}
            alt={movie.title}
            fill
            unoptimized
            sizes="(max-width: 768px) 42vw, 200px"
            className="object-cover"
          />

          <div className="absolute left-1.5 top-1.5">
            <Badge tone="brand" className="px-1.5 py-0.5 text-[10px]">
              {movie.classification}
            </Badge>
          </div>
          {movie.status === "COMING_SOON" && (
            <div className="absolute right-1.5 top-1.5">
              <Badge tone="gold" className="px-1.5 py-0.5 text-[10px]">
                {releaseDateShort ?? "Soon"}
              </Badge>
            </div>
          )}

          {/* Netflix-style hover reveal (desktop/hover-capable only) */}
          <div className="absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:flex">
            <div className="flex items-center justify-center py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/30">
                <Play size={16} className="ml-0.5 fill-white text-white" />
              </span>
            </div>
            <div className="p-2.5 pt-0">
              {!compact && (
                <p className="line-clamp-2 text-[11px] text-white/70">{movie.synopsis}</p>
              )}
              <div className="mt-1 flex items-center gap-2 text-[10px] text-white/70">
                {hasRating && (
                  <span className="flex items-center gap-0.5 text-accent-gold">
                    <Star size={9} className="fill-accent-gold" />
                    {movie.rating!.toFixed(1)}
                  </span>
                )}
                <span>{formatRuntime(movie.runtimeMins)}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-1.5 line-clamp-1 text-xs font-medium text-foreground/90 group-hover:text-foreground sm:text-sm">
          {movie.title}
        </p>
        {movie.status === "COMING_SOON" && releaseDateFull && (
          <p className="line-clamp-1 text-[11px] text-accent-gold">Releases {releaseDateFull}</p>
        )}
      </Link>
    </motion.div>
  );
}
