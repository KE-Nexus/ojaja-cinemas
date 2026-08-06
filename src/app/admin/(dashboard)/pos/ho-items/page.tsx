import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, ImageOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { DeleteButton } from "@/components/admin/delete-button";
import { AddToLocationButton } from "@/components/admin/add-to-location-button";
import { deletePosItemAction } from "@/actions/admin/pos-items";
import { getBranchScope } from "@/lib/branch-scope";

export default async function HoItemsPage() {
  const scope = await getBranchScope();

  const [items, branches] = await Promise.all([
    prisma.posItem.findMany({ where: { branchId: null }, orderBy: { createdAt: "desc" } }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HO Items</h1>
          <p className="text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"} in the shared master catalog</p>
        </div>
        <Button href="/admin/pos/ho-items/new">
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No HO items yet.</p>
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
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <AddToLocationButton itemId={it.id} itemName={it.name} branches={branches} />
                      <Link href={`/admin/pos/ho-items/${it.id}/edit`} className="text-muted hover:text-brand-light">
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
