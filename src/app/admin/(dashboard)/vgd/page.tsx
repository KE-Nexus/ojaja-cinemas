import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { DeleteButton } from "@/components/admin/delete-button";
import { VgdRedeemForm } from "@/components/admin/vgd-redeem-form";
import { cancelVgdAction } from "@/actions/admin/vgd";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";
import { formatNaira } from "@/lib/format";

const STATUS_TONE = { ACTIVE: "success", REDEEMED: "neutral", EXPIRED: "danger", CANCELLED: "danger" } as const;
const TYPE_LABEL = { VOUCHER: "Voucher", GIFT_CARD: "Gift Card", DISCOUNT: "Discount" } as const;

export default async function VgdPage({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_ACCESS_VGD"))) redirect("/admin");

  const { location } = await searchParams;
  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [records, branches] = await Promise.all([
    prisma.vgdRecord.findMany({
      where: scope.isCircuitAdmin ? (effectiveLocation ? { branchId: effectiveLocation } : undefined) : { OR: [{ branchId: scope.branchId }, { branchId: null }] },
      include: { branch: true, issuedBy: true, redeemedBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    scope.isCircuitAdmin ? prisma.branch.findMany({ orderBy: { name: "asc" } }) : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vouchers, Gifts &amp; Discounts</h1>
          <p className="text-sm text-muted">{records.length} record{records.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/admin/vgd/new">
          <Plus size={16} /> Issue New
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Redeem a code</h2>
        <VgdRedeemForm />
      </div>

      {scope.isCircuitAdmin && (
        <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
          <LocationFilterField branches={branches} selected={effectiveLocation} locked={false} />
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {effectiveLocation && (
            <Link href="/admin/vgd" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
              <X size={14} /> Clear
            </Link>
          )}
        </form>
      )}

      {records.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No records yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Code</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Value</th>
                <th className="p-3 font-medium">Recipient</th>
                <th className="p-3 font-medium">Cinema</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="p-3 font-mono text-xs">{r.code}</td>
                  <td className="p-3">{TYPE_LABEL[r.type]}</td>
                  <td className="p-3 text-muted">{r.isPercent ? `${r.value}%` : formatNaira(r.value)}</td>
                  <td className="p-3 text-muted">{r.recipientName ?? "—"}</td>
                  <td className="p-3 text-muted">{r.branch?.name ?? "All locations"}</td>
                  <td className="p-3">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </td>
                  <td className="p-3">
                    {r.status === "ACTIVE" && <DeleteButton action={cancelVgdAction.bind(null, r.id)} confirmText={`Cancel code ${r.code}?`} />}
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
