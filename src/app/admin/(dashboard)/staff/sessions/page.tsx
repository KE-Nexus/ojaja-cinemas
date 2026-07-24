import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import { expectedTotalsForSession } from "@/lib/staff-sessions";
import { OpenSessionButton } from "@/components/admin/open-session-button";
import { CloseSessionModal } from "@/components/admin/close-session-modal";

function variance(actual: number | null, expected: number) {
  if (actual === null) return null;
  return actual - expected;
}

function VarianceCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const tone = value === 0 ? "text-muted" : value > 0 ? "text-success" : "text-danger";
  return <span className={tone}>{value > 0 ? "+" : ""}{formatNaira(value)}</span>;
}

export default async function StaffSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const { location } = await searchParams;

  const [sessions, branches] = await Promise.all([
    prisma.staffSession.findMany({
      where: location ? { branchId: location } : undefined,
      include: { staff: true, branch: true, closedBy: true },
      orderBy: { openedAt: "desc" },
      take: 50,
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = await Promise.all(
    sessions.map(async (s) => {
      const expected = await expectedTotalsForSession(s);
      const totalExpected = expected.card + expected.cash + expected.transfer + expected.voucher;
      const actualCard = s.actualCard;
      const actualCash = s.actualCash;
      const actualTransfer = s.actualTransfer;
      const actualVoucher = s.actualVoucher;
      const totalActual =
        s.status === "CLOSED" ? (actualCard ?? 0) + (actualCash ?? 0) + (actualTransfer ?? 0) + (actualVoucher ?? 0) : null;

      return {
        session: s,
        expected,
        totalExpected,
        totalActual,
        varCard: variance(actualCard, expected.card),
        varCash: variance(actualCash, expected.cash),
        varTransfer: variance(actualTransfer, expected.transfer),
        varVoucher: variance(actualVoucher, expected.voucher),
        varTotal: totalActual === null ? null : totalActual - totalExpected,
      };
    })
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Sessions</h1>
          <p className="text-sm text-muted">Cash reconciliation — expected vs. actual, per shift.</p>
        </div>
        <OpenSessionButton />
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <Select name="location" defaultValue={location ?? ""} className="max-w-xs">
          <option value="">All Locations</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {location && (
          <Link href="/admin/staff/sessions" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No staff sessions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Staff Name</th>
                <th className="p-3 font-medium">Actual Card</th>
                <th className="p-3 font-medium">Actual Cash</th>
                <th className="p-3 font-medium">Actual Transfer</th>
                <th className="p-3 font-medium">Actual Ext. Voucher</th>
                <th className="p-3 font-medium">Expected Card</th>
                <th className="p-3 font-medium">Expected Cash</th>
                <th className="p-3 font-medium">Expected Transfer</th>
                <th className="p-3 font-medium">Expected Ext. Voucher</th>
                <th className="p-3 font-medium">Total Expected</th>
                <th className="p-3 font-medium">Total Actual</th>
                <th className="p-3 font-medium">Card Variance</th>
                <th className="p-3 font-medium">Cash Variance</th>
                <th className="p-3 font-medium">Transfer Variance</th>
                <th className="p-3 font-medium">Ext. Voucher Variance</th>
                <th className="p-3 font-medium">Total Variance</th>
                <th className="p-3 font-medium">Opened On</th>
                <th className="p-3 font-medium">Closed By</th>
                <th className="p-3 font-medium">Closed On</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ session: s, expected, totalExpected, totalActual, varCard, varCash, varTransfer, varVoucher, varTotal }) => (
                <tr key={s.id} className="border-b border-border/50 whitespace-nowrap">
                  <td className="p-3">
                    <Badge tone={s.status === "OPEN" ? "gold" : "success"}>{s.status === "OPEN" ? "Open" : "Closed"}</Badge>
                  </td>
                  <td className="p-3 font-medium">
                    {s.staff.name}
                    <div className="text-xs font-normal text-muted">{s.branch.name}</div>
                  </td>
                  <td className="p-3 text-muted">{s.actualCard !== null ? formatNaira(s.actualCard) : "—"}</td>
                  <td className="p-3 text-muted">{s.actualCash !== null ? formatNaira(s.actualCash) : "—"}</td>
                  <td className="p-3 text-muted">{s.actualTransfer !== null ? formatNaira(s.actualTransfer) : "—"}</td>
                  <td className="p-3 text-muted">{s.actualVoucher !== null ? formatNaira(s.actualVoucher) : "—"}</td>
                  <td className="p-3 text-muted">{formatNaira(expected.card)}</td>
                  <td className="p-3 text-muted">{formatNaira(expected.cash)}</td>
                  <td className="p-3 text-muted">{formatNaira(expected.transfer)}</td>
                  <td className="p-3 text-muted">{formatNaira(expected.voucher)}</td>
                  <td className="p-3 font-medium">{formatNaira(totalExpected)}</td>
                  <td className="p-3 font-medium">{totalActual !== null ? formatNaira(totalActual) : "—"}</td>
                  <td className="p-3">
                    <VarianceCell value={varCard} />
                  </td>
                  <td className="p-3">
                    <VarianceCell value={varCash} />
                  </td>
                  <td className="p-3">
                    <VarianceCell value={varTransfer} />
                  </td>
                  <td className="p-3">
                    <VarianceCell value={varVoucher} />
                  </td>
                  <td className="p-3 font-semibold">
                    <VarianceCell value={varTotal} />
                  </td>
                  <td className="p-3 text-muted">{s.openedAt.toLocaleString("en-NG")}</td>
                  <td className="p-3 text-muted">{s.closedBy?.name ?? "—"}</td>
                  <td className="p-3 text-muted">{s.closedAt ? s.closedAt.toLocaleString("en-NG") : "—"}</td>
                  <td className="p-3">{s.status === "OPEN" && <CloseSessionModal id={s.id} staffName={s.staff.name} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
