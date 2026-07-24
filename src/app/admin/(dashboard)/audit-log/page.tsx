import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAuditLogPage() {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN" && session?.role !== "AUDITOR") redirect("/admin");

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Audit Log</h1>
      <p className="mb-6 text-sm text-muted">A record of every administrative action taken in the system.</p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">When</th>
              <th className="p-3 font-medium">Actor</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Entity</th>
              <th className="p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/50">
                <td className="p-3 text-muted">{new Date(log.createdAt).toLocaleString("en-NG")}</td>
                <td className="p-3">{log.actor?.name ?? "System"}</td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3 text-muted">
                  {log.entityType} · <span className="font-mono text-xs">{log.entityId}</span>
                </td>
                <td className="p-3 text-xs text-muted">{log.metadata}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  No actions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
