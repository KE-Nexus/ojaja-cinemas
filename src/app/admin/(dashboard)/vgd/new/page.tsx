import { prisma } from "@/lib/prisma";
import { VgdIssueForm } from "@/components/admin/vgd-issue-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function NewVgdPage() {
  const scope = await getBranchScope();
  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Issue Voucher / Gift / Discount</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <VgdIssueForm branches={branches} isCircuitAdmin={scope.isCircuitAdmin} />
      </div>
    </div>
  );
}
