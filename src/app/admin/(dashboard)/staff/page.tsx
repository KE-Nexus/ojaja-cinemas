import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { StaffActionsModal } from "@/components/admin/staff-actions-modal";

const ROLE_LABELS: Record<string, string> = {
  TICKETER: "Ticketer",
  ACCOUNTANT: "Accountant",
  SUPERVISOR: "Supervisor",
  TECHNICIAN: "Technician",
  AUDITOR: "Auditor",
  CIRCUIT_ADMIN: "Circuit Admin",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const { location } = await searchParams;

  const [staff, branches] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "CUSTOMER" }, ...(location ? { branchId: location } : {}) },
      include: { branch: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
          <p className="text-sm text-muted">{staff.length} staff member{staff.length === 1 ? "" : "s"}</p>
        </div>
        <Button href="/admin/staff/invite">
          <UserPlus size={16} /> Invite Staff
        </Button>
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2">
        <Select name="location" defaultValue={location ?? ""} className="max-w-xs">
          <option value="">All Locations</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {location && (
          <Link href="/admin/staff" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {staff.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {location ? "No staff at this cinema." : "No staff yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">User Number</th>
                <th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="p-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                  </td>
                  <td className="p-3 text-muted">{ROLE_LABELS[s.role] ?? s.role}</td>
                  <td className="p-3 text-muted">{s.staffNumber ?? "—"}</td>
                  <td className="p-3 text-muted">{s.branch?.name ?? "Circuit-wide"}</td>
                  <td className="p-3">
                    <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="p-3">
                    <StaffActionsModal
                      staff={{ id: s.id, name: s.name, email: s.email, isActive: s.isActive, branchId: s.branchId }}
                      branches={branches}
                    />
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
