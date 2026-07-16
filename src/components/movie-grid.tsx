import Link from "next/link";
import { MovieCard, type MovieCardData } from "@/components/movie-card";
import { Reveal } from "@/components/decor/reveal";

export function MovieGrid({
  title,
  movies,
  viewAllHref,
}: {
  title: string;
  movies: MovieCardData[];
  viewAllHref?: string;
}) {
  if (movies.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
      <Reveal>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm font-medium text-muted hover:text-foreground">
              View all
            </Link>
          )}
        </div>
      </Reveal>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {movies.map((movie, i) => (
          <MovieCard key={movie.slug} movie={movie} index={i} />
        ))}
      </div>
    </section>
  );
}
