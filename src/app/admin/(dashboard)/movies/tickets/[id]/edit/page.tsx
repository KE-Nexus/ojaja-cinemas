import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function EditTicketClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getBranchScope();
  const [ticket, branches] = await Promise.all([
    prisma.ticketClass.findUnique({ where: { id } }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);
  if (!ticket) notFound();
  if (!scope.isCircuitAdmin && ticket.branchId !== scope.branchId) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Ticket Class</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm ticket={ticket} branches={branches} />
      </div>
    </div>
  );
}
