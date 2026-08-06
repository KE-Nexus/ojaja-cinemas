import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { PriceCardToggle } from "@/components/admin/price-card-toggle";
import { deletePriceCardAction } from "@/actions/admin/price-cards";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

export default async function PriceCardsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_VIEW_PRICECARDS"))) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [priceCards, branches] = await Promise.all([
    prisma.priceCard.findMany({
      where: effectiveLocation ? { branchId: effectiveLocation } : undefined,
      include: { branch: true, _count: { select: { tickets: true } } },
      orderBy: { createdAt: "desc" },
    }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Cards</h1>
          <p className="text-sm text-muted">{priceCards.length} price card{priceCards.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/admin/movies/price-cards/new">
          <Plus size={16} /> Create
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/movies/price-cards" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {priceCards.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {effectiveLocation ? "No price cards for this cinema." : "No price cards yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">S/N</th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Days</th>
                <th className="p-3 font-medium">Cinema</th>
                <th className="p-3 font-medium">Tickets</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {priceCards.map((p, i) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted">{p.days.length === 7 ? "ALL" : p.days.join(", ")}</td>
                  <td className="p-3 text-muted">{p.branch.name}</td>
                  <td className="p-3 text-muted">{p._count.tickets}</td>
                  <td className="p-3">
                    <PriceCardToggle id={p.id} isActive={p.isActive} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/movies/price-cards/${p.id}/edit`} className="text-muted hover:text-brand-light">
                        <Pencil size={15} />
                      </Link>
                      <DeleteButton action={deletePriceCardAction.bind(null, p.id)} confirmText={`Delete "${p.name}" (${p.branch.name})?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
