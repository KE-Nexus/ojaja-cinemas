import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";

export default async function NewTicketClassPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Ticket Class</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm branches={branches} />
      </div>
    </div>
  );
}
