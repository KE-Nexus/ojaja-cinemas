import { prisma } from "@/lib/prisma";
import { Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StockTransferForm } from "@/components/admin/stock-transfer-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function NewStockTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ fromBranchId?: string; toBranchId?: string }>;
}) {
  const { fromBranchId: requestedFrom, toBranchId } = await searchParams;
  const scope = await getBranchScope();
  const fromBranchId = scope.isCircuitAdmin ? requestedFrom : (scope.branchId ?? undefined);

  const allBranches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  if (!fromBranchId || !toBranchId) {
    return (
      <div className="max-w-md">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">New Stock Transfer</h1>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <form method="get" className="space-y-4">
            {scope.isCircuitAdmin ? (
              <div>
                <Label htmlFor="fromBranchId">From cinema</Label>
                <Select id="fromBranchId" name="fromBranchId" defaultValue={fromBranchId ?? ""} required>
                  <option value="" disabled>
                    Select source cinema
                  </option>
                  {allBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted">Sending from your assigned cinema.</p>
            )}
            <div>
              <Label htmlFor="toBranchId">To cinema</Label>
              <Select id="toBranchId" name="toBranchId" defaultValue={toBranchId ?? ""} required>
                <option value="" disabled>
                  Select destination cinema
                </option>
                {allBranches.map((b) => (
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

  const fromBranch = allBranches.find((b) => b.id === fromBranchId);
  const toBranch = allBranches.find((b) => b.id === toBranchId);
  const items = await prisma.posItem.findMany({ where: { branchId: fromBranchId, stockOnHand: { gt: 0 } }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">New Stock Transfer</h1>
      <p className="mb-6 text-sm text-muted">
        {fromBranch?.name} → {toBranch?.name}
      </p>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <StockTransferForm fromBranchId={fromBranchId} toBranchId={toBranchId} items={items} />
      </div>
    </div>
  );
}
