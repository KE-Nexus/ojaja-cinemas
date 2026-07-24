import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const notifications = await prisma.notificationOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Notification Outbox</h1>
      <p className="mb-6 text-sm text-muted">
        Simulated email/SMS sends for this demo build — swap <code>MockNotificationProvider</code> for a real
        Resend/Termii client to deliver these for real.
      </p>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div key={n.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={n.type === "EMAIL" ? "brand" : "gold"}>{n.type}</Badge>
                <span className="text-sm font-medium">{n.to}</span>
              </div>
              <span className="text-xs text-muted">{new Date(n.createdAt).toLocaleString("en-NG")}</span>
            </div>
            {n.type === "EMAIL" && <p className="text-sm font-medium">{n.subject}</p>}
            <p className="text-sm text-muted">{n.body}</p>
          </div>
        ))}
        {notifications.length === 0 && <p className="text-muted">No notifications sent yet.</p>}
      </div>
    </div>
  );
}
