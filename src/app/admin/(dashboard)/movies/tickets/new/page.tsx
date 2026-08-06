import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function NewTicketClassPage() {
  const scope = await getBranchScope();
  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });
  const branchIds = branches.map((b) => b.id);

  const [standardTickets, items] = await Promise.all([
    prisma.ticketClass.findMany({
      where: { branchId: { in: branchIds }, kind: "STANDARD" },
      include: { branch: true },
      orderBy: { description: "asc" },
    }),
    prisma.posItem.findMany({ where: { branchId: { in: branchIds } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Ticket</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm
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
