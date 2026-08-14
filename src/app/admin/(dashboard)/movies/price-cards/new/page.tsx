import { prisma } from "@/lib/prisma";
import { PriceCardForm } from "@/components/admin/price-card-form";
import { getBranchScope } from "@/lib/branch-scope";

function kindLabel(kind: string) {
  return kind === "PACKAGE" ? "Package" : kind === "VOUCHER" ? "Voucher" : "Standard";
}

export default async function NewPriceCardPage() {
  const scope = await getBranchScope();
  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });
  const branchIds = branches.map((b) => b.id);

  const tickets = await prisma.ticketClass.findMany({
    where: { branchId: { in: branchIds } },
    orderBy: { description: "asc" },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Price Card</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PriceCardForm
          branches={branches}
          ticketOptions={tickets.map((t) => ({
            id: t.id,
            label: t.description,
            kindLabel: kindLabel(t.kind),
            type: t.type,
            defaultPrice: t.defaultPrice,
            branchId: t.branchId,
          }))}
          initialTicketIds={[]}
        />
      </div>
    </div>
  );
}
