import { prisma } from "@/lib/prisma";
import { FilmContractForm } from "@/components/admin/film-contract-form";

export default async function NewFilmContractPage() {
  const [branches, movies] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Film Contract</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <FilmContractForm branches={branches} movies={movies} />
      </div>
    </div>
  );
}
