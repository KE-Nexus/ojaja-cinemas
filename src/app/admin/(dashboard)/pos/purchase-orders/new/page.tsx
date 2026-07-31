import { prisma } from "@/lib/prisma";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const { branchId } = await searchParams;
  const scope = await getBranchScope();
  const effectiveBranchId = resolveScopedBranchId(scope, branchId);

  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });

  if (!effectiveBranchId) {
    return (
      <div className="max-w-md">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">New Purchase Order</h1>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <form method="get" className="space-y-4">
            <div>
              <Label htmlFor="branchId">Cinema</Label>
              <Select id="branchId" name="branchId" defaultValue="" required>
                <option value="" disabled>
                  Select a cinema
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">Continue</Button>
          </form>
        </div>
      </div>
    );
  }

  const branch = branches.find((b) => b.id === effectiveBranchId);
  const items = await prisma.posItem.findMany({ where: { branchId: effectiveBranchId }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">New Purchase Order</h1>
      <p className="mb-6 text-sm text-muted">{branch?.name}</p>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PurchaseOrderForm branchId={effectiveBranchId} items={items} />
      </div>
    </div>
  );
}
