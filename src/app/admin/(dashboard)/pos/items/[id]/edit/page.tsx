import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PosItemForm } from "@/components/admin/pos-item-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function EditLocationItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getBranchScope();
  const [item, branches] = await Promise.all([
    prisma.posItem.findUnique({ where: { id } }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);
  if (!item) notFound();
  if (!scope.isCircuitAdmin && item.branchId !== scope.branchId) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Item</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <PosItemForm item={item} branches={branches} requireBranch />
      </div>
    </div>
  );
}
