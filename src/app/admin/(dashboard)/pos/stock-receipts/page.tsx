import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { ApproveButton } from "@/components/admin/approve-button";
import { approveStockReceiptAction } from "@/actions/admin/stock-receipts";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";
import { formatShowtime } from "@/lib/format";

const STATUS_TONE = { PENDING: "gold", APPROVED: "success" } as const;

export default async function StockReceiptsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_RECEIPT"))) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [receipts, branches] = await Promise.all([
    prisma.stockReceipt.findMany({
      where: effectiveLocation ? { branchId: effectiveLocation } : undefined,
      include: { branch: true, receivedBy: true, lines: { include: { posItem: true } } },
      orderBy: { createdAt: "desc" },
    }),
    scope.isCircuitAdmin ? prisma.branch.findMany({ orderBy: { name: "asc" } }) : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Receipts</h1>
          <p className="text-sm text-muted">{receipts.length} receipt{receipts.length === 1 ? "" : "s"}</p>
        </div>
        <Button href={`/admin/pos/stock-receipts/new${effectiveLocation ? `?branchId=${effectiveLocation}` : ""}`}>
          <Plus size={16} /> New Receipt
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/pos/stock-receipts" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {receipts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No stock receipts yet.</p>
      ) : (
        <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.branch.name}</p>
                  <p className="text-xs text-muted">
                    Received by {r.receivedBy.name} · {formatShowtime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  {r.status === "PENDING" && (
                    <ApproveButton action={approveStockReceiptAction.bind(null, r.id)} confirmText="Approve this receipt and add stock on hand?" />
                  )}
                </div>
              </div>
              <ul className="space-y-1 text-sm text-muted">
                {r.lines.map((l) => (
                  <li key={l.id}>
                    {l.posItem.name} × {l.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
