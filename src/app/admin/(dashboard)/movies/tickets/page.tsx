import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { DeleteButton } from "@/components/admin/delete-button";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { TicketClassToggle } from "@/components/admin/ticket-class-toggle";
import { deleteTicketClassAction } from "@/actions/admin/ticket-classes";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

export default async function TicketClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_VIEW_PRICECARDS"))) redirect("/admin");

  const { location } = await searchParams;

  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [tickets, branches] = await Promise.all([
    prisma.ticketClass.findMany({
      where: effectiveLocation ? { branchId: effectiveLocation } : undefined,
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-sm text-muted">{tickets.length} ticket class{tickets.length === 1 ? "" : "es"}</p>
        </div>
        <Button href="/admin/movies/tickets/new">
          <Plus size={16} /> Add Ticket Class
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {effectiveLocation && scope.isCircuitAdmin && (
          <Link href="/admin/movies/tickets" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {tickets.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {effectiveLocation ? "No ticket classes for this cinema." : "No ticket classes yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">S/N</th>
                <th className="p-3 font-medium">Description</th>
                <th className="p-3 font-medium">Ticket Class</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Default Price</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3 font-medium">{t.className}</td>
                  <td className="p-3 text-muted">{t.type}</td>
                  <td className="p-3 text-muted">{formatNaira(t.defaultPrice)}</td>
                  <td className="p-3">
                    <TicketClassToggle id={t.id} isActive={t.isActive} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/movies/tickets/${t.id}/edit`} className="text-muted hover:text-brand-light">
                        <Pencil size={15} />
                      </Link>
                      <DeleteButton action={deleteTicketClassAction.bind(null, t.id)} confirmText={`Delete "${t.className}" (${t.branch.name})?`} />
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
