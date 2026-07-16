import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRoleSelect } from "@/components/admin/user-role-select";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Users &amp; Roles</h1>
      <p className="mb-6 text-sm text-muted">Assign staff roles for access to the admin portal.</p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted">{u.email}</td>
                <td className="p-3 text-muted">{new Date(u.createdAt).toLocaleDateString("en-NG")}</td>
                <td className="p-3">
                  <UserRoleSelect userId={u.id} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
