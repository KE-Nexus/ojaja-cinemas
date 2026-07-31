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
import { decideStockRequestAction } from "@/actions/admin/stock-requests";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";
import { formatShowtime } from "@/lib/format";

const STATUS_TONE = { PENDING: "gold", APPROVED: "success", REJECTED: "danger" } as const;

export default async function StockRequestsPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_REQUEST"))) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [requests, branches] = await Promise.all([
    prisma.stockRequest.findMany({
      where: effectiveLocation ? { branchId: effectiveLocation } : undefined,
      include: { branch: true, requestedBy: true, lines: { include: { posItem: true } } },
      orderBy: { createdAt: "desc" },
    }),
    scope.isCircuitAdmin ? prisma.branch.findMany({ orderBy: { name: "asc" } }) : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Requests</h1>
          <p className="text-sm text-muted">{requests.length} request{requests.length === 1 ? "" : "s"}</p>
        </div>
        <Button href={`/admin/pos/stock-requests/new${effectiveLocation ? `?branchId=${effectiveLocation}` : ""}`}>
          <Plus size={16} /> New Request
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/pos/stock-requests" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No stock requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.branch.name}</p>
                  <p className="text-xs text-muted">
                    Requested by {r.requestedBy.name} · {formatShowtime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  {r.status === "PENDING" && (
                    <ApproveRejectButtons
                      onApprove={decideStockRequestAction.bind(null, r.id, true)}
                      onReject={decideStockRequestAction.bind(null, r.id, false)}
                      confirmApprove="Approve this stock request?"
                      confirmReject="Reject this stock request?"
                    />
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
              {r.note && <p className="mt-2 text-xs italic text-muted">&quot;{r.note}&quot;</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
