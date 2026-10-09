import { prisma } from "@/lib/prisma";
import { MovieForm } from "@/components/admin/movie-form";

export default async function NewMoviePage() {
  const [distributors, languages] = await Promise.all([
    prisma.distributor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.language.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Add Movie</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <MovieForm distributors={distributors} languages={languages} />
      </div>
    </div>
  );
}
