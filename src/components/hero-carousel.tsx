"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, Info, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRuntime } from "@/lib/format";
import Link from "next/link";

export type HeroMovie = {
  slug: string;
  title: string;
  posterUrl: string;
  backdropUrl: string | null;
  genres: string;
  runtimeMins: number;
  classification: string;
  synopsis: string;
  rating: number | null;
  reviewCount: number;
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const AUTO_ADVANCE_MS = 7000;

export function HeroCarousel({ movies }: { movies: HeroMovie[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % movies.length), [movies.length]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + movies.length) % movies.length), [movies.length]);

  useEffect(() => {
    if (paused || movies.length <= 1) return;
    const t = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [next, paused, movies.length]);

  if (movies.length === 0) return null;
  const hero = movies[index];

  return (
    <div
      className="group/hero relative flex h-[92vh] max-h-[900px] min-h-[560px] items-end overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={hero.slug}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image src={hero.backdropUrl ?? hero.posterUrl} alt="" fill unoptimized referrerPolicy="no-referrer" priority className="object-cover" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/20 to-transparent" />
      </div>

      <div className="relative z-10 w-full px-4 pb-16 sm:px-6 sm:pb-20 lg:px-10">
        <AnimatePresence mode="wait">
          <motion.div key={hero.slug} variants={container} initial="hidden" animate="show" exit={{ opacity: 0, transition: { duration: 0.25 } }} className="max-w-xl">
            <motion.div variants={item} className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="brand" className="animate-marquee-glow">
                Now Showing
              </Badge>
              {hero.rating !== null && (
                <Badge tone="gold">
                  <Star size={11} className="fill-accent-gold" /> {hero.rating.toFixed(1)} ({hero.reviewCount})
                </Badge>
              )}
            </motion.div>
            <motion.h1 variants={item} className="font-display text-glow text-5xl leading-[0.95] tracking-wide sm:text-6xl md:text-7xl">
              {hero.title}
            </motion.h1>
            <motion.p variants={item} className="mt-4 text-sm text-muted sm:text-base">
              {hero.genres} · {formatRuntime(hero.runtimeMins)} · {hero.classification}
            </motion.p>
            <motion.p variants={item} className="mt-4 line-clamp-3 text-foreground/85">
              {hero.synopsis}
            </motion.p>
            <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/movies/${hero.slug}`}
                className="flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Play size={18} className="fill-black" /> Book Now
              </Link>
              <Link
                href={`/movies/${hero.slug}`}
                className="flex items-center gap-2 rounded-md bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                <Info size={18} /> More Info
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {movies.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous movie"
            className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover/hero:opacity-100 sm:flex"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next movie"
            className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/50 group-hover/hero:opacity-100 sm:flex"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-6 right-4 z-20 flex items-center gap-2 sm:right-10">
            {movies.map((m, i) => (
              <button
                key={m.slug}
                onClick={() => setIndex(i)}
                aria-label={`Show ${m.title}`}
                className="group relative h-1.5 w-6 overflow-hidden rounded-full bg-white/20"
              >
                {i === index && (
                  <motion.span layoutId="hero-dot" className="absolute inset-0 bg-brand" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
