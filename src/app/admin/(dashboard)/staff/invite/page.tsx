import { prisma } from "@/lib/prisma";
import { InviteStaffForm } from "@/components/admin/invite-staff-form";

export default async function InviteStaffPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Invite Staff</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <InviteStaffForm branches={branches} />
      </div>
    </div>
  );
}
