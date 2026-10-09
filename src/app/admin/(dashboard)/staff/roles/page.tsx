import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { RoleClaimsActions } from "@/components/admin/role-claims-actions";
import { CreateClaimModal } from "@/components/admin/create-claim-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Role } from "@prisma/client";

const ROLE_ORDER: { role: Role; label: string }[] = [
  { role: "CIRCUIT_ADMIN", label: "CircuitAdmin" },
  { role: "TICKETER", label: "Ticketer" },
  { role: "SUPERVISOR", label: "Supervisor" },
  { role: "TECHNICIAN", label: "Technician" },
  { role: "ACCOUNTANT", label: "Accountant" },
  { role: "AUDITOR", label: "Auditor" },
  { role: "DRIVER", label: "Driver" },
];

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getSession();
  // Managing permissions is Circuit Admin only — see the note in actions/admin/roles.ts.
  if (session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const { q } = await searchParams;
  const query = q?.trim().toLowerCase();

  const [claims, roleClaims] = await Promise.all([
    prisma.claim.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.roleClaim.findMany(),
  ]);

  const grantedByRole = new Map<Role, Set<string>>();
  for (const rc of roleClaims) {
    if (!grantedByRole.has(rc.role)) grantedByRole.set(rc.role, new Set());
    grantedByRole.get(rc.role)!.add(rc.claimId);
  }

  const visibleRoles = query ? ROLE_ORDER.filter((r) => r.label.toLowerCase().includes(query) || r.role.toLowerCase().includes(query)) : ROLE_ORDER;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
          <p className="text-sm text-muted">Grant or revoke fine-grained permissions per role.</p>
        </div>
        <CreateClaimModal />
      </div>

      <form method="get" className="mb-6 flex items-center gap-2">
        <Input name="q" defaultValue={query ?? ""} placeholder="Search by role name" className="max-w-xs" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {visibleRoles.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No roles match your search.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">No.</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRoles.map(({ role, label }, i) => (
                <tr key={role} className="border-b border-border/50 last:border-0">
                  <td className="p-3 text-muted">{i + 1}</td>
                  <td className="p-3 font-medium">{label}</td>
                  <td className="p-3">
                    <RoleClaimsActions
                      role={role}
                      roleLabel={label}
                      claims={claims}
                      grantedClaimIds={Array.from(grantedByRole.get(role) ?? [])}
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
