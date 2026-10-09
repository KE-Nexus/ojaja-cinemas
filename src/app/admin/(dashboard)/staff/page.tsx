import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationFilterField } from "@/components/admin/location-filter-field";
import { StaffActionsModal } from "@/components/admin/staff-actions-modal";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

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
  searchParams: Promise<{ location?: string; q?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const { location, q } = await searchParams;
  const query = q?.trim();

  const scope = await getBranchScope();
  const effectiveLocation = resolveScopedBranchId(scope, location);

  const [staff, branches] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: "CUSTOMER" },
        ...(effectiveLocation ? { branchId: effectiveLocation } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { staffNumber: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { branch: true },
      orderBy: { createdAt: "asc" },
    }),
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
  ]);

  const distinctRoles = Array.from(new Set(staff.map((s) => s.role))) as Role[];
  const classificationByRole = new Map<Role, { circuit: boolean; international: boolean }>();
  await Promise.all(
    distinctRoles.map(async (role) => {
      const [circuit, international] = await Promise.all([
        hasClaim(role, "IS_CIRCUIT_STAFF"),
        hasClaim(role, "IS_INTERNATIONAL_CIRCUIT_STAFF"),
      ]);
      classificationByRole.set(role, { circuit, international });
    })
  );

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
        <Input name="q" defaultValue={query ?? ""} placeholder="Search by name, email, or user number" className="max-w-xs" />
        <LocationFilterField branches={branches} selected={effectiveLocation} locked={!scope.isCircuitAdmin} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(effectiveLocation || query) && (
          <Link href="/admin/staff" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
            <X size={14} /> Clear
          </Link>
        )}
      </form>

      {staff.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {query ? "No staff match your search." : effectiveLocation ? "No staff at this cinema." : "No staff yet."}
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
                <th className="p-3 font-medium">Classification</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const classification = classificationByRole.get(s.role);
                return (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="p-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                  </td>
                  <td className="p-3 text-muted">{ROLE_LABELS[s.role] ?? s.role}</td>
                  <td className="p-3 text-muted">{s.staffNumber ?? "—"}</td>
                  <td className="p-3 text-muted">{s.branch?.name ?? "Circuit-wide"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {classification?.circuit && <Badge tone="brand">Circuit Staff</Badge>}
                      {classification?.international && <Badge tone="gold">International</Badge>}
                      {!classification?.circuit && !classification?.international && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Disabled"}</Badge>
                  </td>
                  <td className="p-3">
                    <StaffActionsModal
                      staff={{ id: s.id, name: s.name, email: s.email, isActive: s.isActive, branchId: s.branchId }}
                      branches={branches}
                      canTransfer={scope.isCircuitAdmin}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
