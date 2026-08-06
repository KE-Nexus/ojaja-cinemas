import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function EditTicketClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getBranchScope();
  const [ticket, branches] = await Promise.all([
    prisma.ticketClass.findUnique({
      where: { id },
      include: { packageTicketLines: true, packageItemLines: true },
    }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);
  if (!ticket) notFound();
  if (!scope.isCircuitAdmin && ticket.branchId !== scope.branchId) notFound();

  const branchIds = branches.map((b) => b.id);
  const [standardTickets, items] = await Promise.all([
    prisma.ticketClass.findMany({
      where: { branchId: { in: branchIds }, kind: "STANDARD", id: { not: ticket.id } },
      include: { branch: true },
      orderBy: { description: "asc" },
    }),
    prisma.posItem.findMany({ where: { branchId: { in: branchIds } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Update Ticket</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm
          ticket={ticket}
          branches={branches}
          standardTicketOptions={standardTickets.map((t) => ({
            id: t.id,
            label: `${t.description} (${t.branch.name})`,
            defaultPrice: t.defaultPrice,
          }))}
          itemOptions={items.map((it) => ({ id: it.id, label: it.name, defaultPrice: it.defaultPrice }))}
        />
      </div>
    </div>
  );
}
