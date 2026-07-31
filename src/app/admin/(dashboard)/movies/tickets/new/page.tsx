import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function NewTicketClassPage() {
  const scope = await getBranchScope();
  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Ticket Class</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm branches={branches} />
      </div>
    </div>
  );
}
