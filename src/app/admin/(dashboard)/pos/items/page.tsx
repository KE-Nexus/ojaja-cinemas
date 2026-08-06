import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, X, ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { DeleteButton } from "@/components/admin/delete-button";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { deletePosItemAction } from "@/actions/admin/pos-items";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

export default async function AllItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const { location } = await searchParams;

  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [items, branches] = await Promise.all([
    prisma.posItem.findMany({
      where: { branchId: effectiveLocation ? effectiveLocation : { not: null } },
      include: { branch: true },
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
          <h1 className="text-2xl font-bold tracking-tight">All Items</h1>
          <p className="text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"} across locations</p>
        </div>
        <Button href="/admin/pos/items/new">
          <Plus size={16} /> Add Item
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/pos/items" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {effectiveLocation ? "No items for this cinema." : "No location items yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">S/N</th>
                <th className="p-3 font-medium">Photo</th>
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Item Class</th>
                <th className="p-3 font-medium">Item Group</th>
                <th className="p-3 font-medium">Default Price</th>
                <th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.id} className="border-b border-border/50">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-surface-2">
                      {it.imageUrl ? (
                        <Image src={it.imageUrl} alt={it.name} fill unoptimized className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted">
                          <ImageOff size={14} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-medium">{it.name}</td>
                  <td className="p-3 text-muted">{it.itemClass}</td>
                  <td className="p-3 text-muted">{it.itemGroup}</td>
                  <td className="p-3 text-muted">{formatNaira(it.defaultPrice)}</td>
                  <td className="p-3 text-muted">{it.branch?.name ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/pos/items/${it.id}/edit`} className="text-muted hover:text-brand-light">
                        <Pencil size={15} />
                      </Link>
                      <DeleteButton action={deletePosItemAction.bind(null, it.id)} confirmText={`Delete "${it.name}"?`} />
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
