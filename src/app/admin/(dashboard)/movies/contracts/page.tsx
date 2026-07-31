import Link from "next/link";
import { Plus, Pencil, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/admin/delete-button";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { deleteFilmContractAction } from "@/actions/admin/film-contracts";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

const PAGE_SIZE = 15;

export default async function FilmContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; page?: string }>;
}) {
  const { q, location, page } = await searchParams;
  const query = q?.trim() ?? "";
  const pageNum = Math.max(1, Number(page) || 1);

  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const where = {
    ...(effectiveLocation ? { branchId: effectiveLocation } : {}),
    ...(query ? { movie: { title: { contains: query } } } : {}),
  };

  const [contracts, total, branches] = await Promise.all([
    prisma.filmContract.findMany({
      where,
      include: { branch: true, movie: true },
      orderBy: { contractStartDate: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.filmContract.count({ where }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(query || effectiveLocation);

  const buildHref = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (location) sp.set("location", location);
    Object.entries(params).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    return `/admin/movies/contracts?${sp.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Film Contracts</h1>
          <p className="text-sm text-muted">{total} contract{total === 1 ? "" : "s"}</p>
        </div>
        <Button href="/admin/movies/contracts/new">
          <Plus size={16} /> Add Contract
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Search by film title..." className="pl-9" />
        </div>
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters && (
          <Link href="/admin/movies/contracts" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {contracts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {hasFilters ? "No contracts match your filters." : "No film contracts yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">S/N</th>
                <th className="p-3 font-medium">Contract Start Date</th>
                <th className="p-3 font-medium">Cinema</th>
                <th className="p-3 font-medium">Film</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <tr key={c.id} className="border-b border-border/50">
                  <td className="p-3 text-muted">{(pageNum - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="p-3 text-muted">{new Date(c.contractStartDate).toLocaleDateString("en-NG")}</td>
                  <td className="p-3">{c.branch.name}</td>
                  <td className="p-3 font-medium">{c.movie.title}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/movies/contracts/${c.id}/edit`} className="text-muted hover:text-brand-light">
                        <Pencil size={15} />
                      </Link>
                      <DeleteButton
                        action={deleteFilmContractAction.bind(null, c.id)}
                        confirmText={`Delete the contract for "${c.movie.title}" at ${c.branch.name}?`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          {pageNum > 1 && (
            <Link href={buildHref({ page: String(pageNum - 1) })} className="text-brand-light hover:underline">
              Previous
            </Link>
          )}
          <span className="text-muted">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link href={buildHref({ page: String(pageNum + 1) })} className="text-brand-light hover:underline">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
