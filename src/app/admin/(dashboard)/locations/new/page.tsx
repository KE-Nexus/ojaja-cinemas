import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { BranchForm } from "@/components/admin/branch-form";

export default async function NewLocationPage() {
  const session = await getSession();
  const canEditBank = session ? await hasClaim(session.role, "CAN_UPDATE_CINEMA_BANK_ACCOUNT") : false;

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add Cinema</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <BranchForm canEditBank={canEditBank} />
      </div>
    </div>
  );
}
