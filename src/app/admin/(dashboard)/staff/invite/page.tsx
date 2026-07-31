import { prisma } from "@/lib/prisma";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";
import { getBranchScope } from "@/lib/branch-scope";

export default async function InviteStaffPage() {
  const scope = await getBranchScope();
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const lockedBranch = scope.isCircuitAdmin ? undefined : branches.find((b) => b.id === scope.branchId);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Invite Staff</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <InviteStaffForm branches={branches} lockedBranch={lockedBranch} />
      </div>
    </div>
  );
}
