import { redirect } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproveButton } from "@/components/admin/approve-button";
import { approveStockTransferAction } from "@/actions/admin/stock-transfers";
import { getBranchScope } from "@/lib/branch-scope";
import { formatShowtime } from "@/lib/format";

const STATUS_TONE = { PENDING: "gold", APPROVED: "success" } as const;

export default async function StockTransfersPage() {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT"))) redirect("/admin");

  const scope = await getBranchScope();

  const transfers = await prisma.stockTransferReceipt.findMany({
    where: scope.isCircuitAdmin ? undefined : { OR: [{ fromBranchId: scope.branchId ?? undefined }, { toBranchId: scope.branchId ?? undefined }] },
    include: { fromBranch: true, toBranch: true, initiatedBy: true, lines: { include: { posItem: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Transfer Receipts</h1>
          <p className="text-sm text-muted">{transfers.length} transfer{transfers.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/admin/pos/stock-transfers/new">
          <Plus size={16} /> New Transfer
        </Button>
      </div>

      {transfers.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No stock transfers yet.</p>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const canApprove = scope.isCircuitAdmin || scope.branchId === t.toBranchId;
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 font-medium">
                      {t.fromBranch.name} <ArrowRight size={14} className="text-muted" /> {t.toBranch.name}
                    </p>
                    <p className="text-xs text-muted">
                      Initiated by {t.initiatedBy.name} · {formatShowtime(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    {t.status === "PENDING" && canApprove && (
                      <ApproveButton
                        action={approveStockTransferAction.bind(null, t.id)}
                        confirmText="Confirm receipt of this stock transfer?"
                        label="Confirm Receipt"
                      />
                    )}
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-muted">
                  {t.lines.map((l) => (
                    <li key={l.id}>
                      {l.posItem.name} × {l.quantity}
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
