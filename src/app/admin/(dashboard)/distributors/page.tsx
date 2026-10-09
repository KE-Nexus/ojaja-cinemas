import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { DistributorForm } from "@/components/admin/distributor-form";
import { DistributorEditModal } from "@/components/admin/distributor-edit-modal";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteDistributorAction } from "@/actions/admin/distributors";

export default async function DistributorsPage() {
  const session = await getSession();
  if (session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const distributors = await prisma.distributor.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Distributors</h1>
      <p className="mb-6 text-sm text-muted">Manage the film distributors every movie gets attached to.</p>

      <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
        <DistributorForm />
      </div>

      {distributors.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No distributors yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {distributors.map((d) => (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 text-muted">{d.email}</td>
                  <td className="p-3 text-muted">{d.phone}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <DistributorEditModal distributor={d} />
                      <DeleteButton action={deleteDistributorAction.bind(null, d.id)} confirmText={`Delete ${d.name}?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
