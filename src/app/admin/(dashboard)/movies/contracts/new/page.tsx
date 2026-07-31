import { prisma } from "@/lib/prisma";
import { FilmContractForm } from "@/components/admin/film-contract-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function NewFilmContractPage() {
  const scope = await getBranchScope();
  const [branches, movies] = await Promise.all([
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
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
