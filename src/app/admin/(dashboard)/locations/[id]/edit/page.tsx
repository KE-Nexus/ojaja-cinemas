import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { BranchForm } from "@/components/admin/branch-form";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  const session = await getSession();
  const canEditBank = session ? await hasClaim(session.role, "CAN_UPDATE_CINEMA_BANK_ACCOUNT") : false;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Edit Cinema</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <BranchForm branch={branch} canEditBank={canEditBank} />
      </div>
    </div>
  );
}
