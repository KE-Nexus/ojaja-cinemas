import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PriceCardForm } from "@/components/admin/price-card-form";
import { getBranchScope } from "@/lib/branch-scope";

function kindLabel(kind: string) {
  return kind === "PACKAGE" ? "Package" : kind === "VOUCHER" ? "Voucher" : "Standard";
}

export default async function EditPriceCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getBranchScope();
  const [priceCard, branches] = await Promise.all([
    prisma.priceCard.findUnique({ where: { id }, include: { tickets: true } }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);
  if (!priceCard) notFound();
  if (!scope.isCircuitAdmin && priceCard.branchId !== scope.branchId) notFound();

  const branchIds = branches.map((b) => b.id);
  const tickets = await prisma.ticketClass.findMany({
    where: { branchId: { in: branchIds } },
    orderBy: { description: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Price Card</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PriceCardForm
          priceCard={priceCard}
          branches={branches}
          ticketOptions={tickets.map((t) => ({
            id: t.id,
            label: t.description,
            kindLabel: kindLabel(t.kind),
            type: t.type,
            defaultPrice: t.defaultPrice,
          }))}
          initialTicketIds={priceCard.tickets.map((t) => t.ticketClassId)}
        />
      </div>
    </div>
  );
}
