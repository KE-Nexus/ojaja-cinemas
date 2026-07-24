import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FilmContractForm } from "@/components/admin/film-contract-form";

export default async function EditFilmContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contract, branches, movies] = await Promise.all([
    prisma.filmContract.findUnique({ where: { id } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.movie.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  if (!contract) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Film Contract</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <FilmContractForm contract={contract} branches={branches} movies={movies} />
      </div>
    </div>
  );
}
