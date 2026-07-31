import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { ApproveRejectButtons } from "@/components/admin/approve-reject-buttons";
import { decidePurchaseOrderAction } from "@/actions/admin/purchase-orders";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";
import { formatNaira, formatShowtime } from "@/lib/format";

const STATUS_TONE = { PENDING: "gold", APPROVED: "success", REJECTED: "danger" } as const;

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  // Anyone who can manage items can create POs; approval is separately gated by the claim on the action itself.
  if (!session || (session.role !== "SUPERVISOR" && session.role !== "CIRCUIT_ADMIN")) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);
  const canApprove = await hasClaim(session.role, "CAN_APPROVE_PURCHASE_ORDER");

  const [orders, branches] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: effectiveLocation ? { branchId: effectiveLocation } : undefined,
      include: { branch: true, createdBy: true, lines: { include: { posItem: true } } },
      orderBy: { createdAt: "desc" },
    }),
    scope.isCircuitAdmin ? prisma.branch.findMany({ orderBy: { name: "asc" } }) : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted">{orders.length} order{orders.length === 1 ? "" : "s"}</p>
        </div>
        <Button href={`/admin/pos/purchase-orders/new${effectiveLocation ? `?branchId=${effectiveLocation}` : ""}`}>
          <Plus size={16} /> New Purchase Order
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/pos/purchase-orders" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No purchase orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const total = o.lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
            return (
              <div key={o.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {o.supplierName} · {o.branch.name}
                    </p>
                    <p className="text-xs text-muted">
                      Created by {o.createdBy.name} · {formatShowtime(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-brand-light">{formatNaira(total)}</span>
                    <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                    {o.status === "PENDING" && canApprove && (
                      <ApproveRejectButtons
                        onApprove={decidePurchaseOrderAction.bind(null, o.id, true)}
                        onReject={decidePurchaseOrderAction.bind(null, o.id, false)}
                        confirmApprove="Approve this purchase order?"
                        confirmReject="Reject this purchase order?"
                      />
                    )}
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-muted">
                  {o.lines.map((l) => (
                    <li key={l.id}>
                      {l.posItem.name} × {l.quantity} @ {formatNaira(l.unitCost)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
