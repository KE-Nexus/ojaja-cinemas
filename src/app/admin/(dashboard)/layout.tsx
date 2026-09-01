import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";
import { hasClaim, getGrantedClaimKeys } from "@/lib/claims";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AppToaster } from "@/components/app-toaster";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) redirect("/admin/login");

  // Guard against a signed session cookie that outlived its user record
  // (e.g. a database reset/reseed generated a fresh id for this account).
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true } });
  if (!user) redirect("/admin/login");

  if (!(await hasClaim(session.role, "CAN_ACCESS_OFFICE"))) redirect("/admin/login");

  const grantedClaims = await getGrantedClaimKeys(session.role);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar name={session.name} role={session.role} grantedClaims={grantedClaims} />
      <main className="min-w-0 flex-1 p-6 pt-20 md:p-8">{children}</main>
      <AppToaster />
    </div>
  );
}
