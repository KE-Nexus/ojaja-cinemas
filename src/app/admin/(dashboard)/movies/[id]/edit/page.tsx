import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MovieForm } from "@/components/admin/movie-form";

export default async function EditMoviePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id } });
  if (!movie) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Edit Movie</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <MovieForm movie={movie} />
      </div>
    </div>
  );
}
