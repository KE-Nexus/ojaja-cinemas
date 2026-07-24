import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketClassForm } from "@/components/admin/ticket-class-form";

export default async function EditTicketClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, branches] = await Promise.all([
    prisma.ticketClass.findUnique({ where: { id } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!ticket) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Ticket Class</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <TicketClassForm ticket={ticket} branches={branches} />
      </div>
    </div>
  );
}
