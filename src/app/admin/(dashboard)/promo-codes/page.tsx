import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { PromoCodeActions } from "@/components/admin/promo-code-actions";
import { formatNaira } from "@/lib/format";

export default async function AdminPromoCodesPage() {
  const promoCodes = await prisma.promoCode.findMany({ orderBy: { code: "asc" } });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Promo Codes</h1>
      <p className="mb-6 text-sm text-muted">Create and manage discount codes for checkout.</p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <PromoCodeForm />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Code</th>
              <th className="p-3 font-medium">Discount</th>
              <th className="p-3 font-medium">Usage</th>
              <th className="p-3 font-medium">Expires</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="p-3 font-mono">{p.code}</td>
                <td className="p-3">{p.discountType === "PERCENT" ? `${p.discountValue}%` : formatNaira(p.discountValue)}</td>
                <td className="p-3 text-muted">
                  {p.usedCount}
                  {p.usageLimit ? ` / ${p.usageLimit}` : ""}
                </td>
                <td className="p-3 text-muted">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("en-NG") : "Never"}</td>
                <td className="p-3">
                  <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "Active" : "Disabled"}</Badge>
                </td>
                <td className="p-3">
                  <PromoCodeActions id={p.id} isActive={p.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
