import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { SeatClassSubscriptionsForm } from "@/components/admin/seat-class-subscriptions-form";

export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/admin");

  const canGetSeatClassAlerts = await hasClaim(session.role, "CAN_GET_SEAT_CLASS_NOTIFICATION");
  const canViewOutbox = session.role === "SUPERVISOR" || session.role === "CIRCUIT_ADMIN";
  if (!canGetSeatClassAlerts && !canViewOutbox) redirect("/admin");

  const [notifications, mySubscriptions] = await Promise.all([
    canViewOutbox ? prisma.notificationOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
    canGetSeatClassAlerts
      ? prisma.seatClassSubscription.findMany({ where: { userId: session.sub }, select: { category: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Notifications</h1>

      {canGetSeatClassAlerts && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-1 font-semibold">Seat Class Alerts</h2>
          <p className="mb-3 text-sm text-muted">Get notified when a seat of the selected class is booked at your cinema.</p>
          <SeatClassSubscriptionsForm subscribed={mySubscriptions.map((s) => s.category)} />
        </div>
      )}

      {canViewOutbox && (
        <div>
          <h2 className="mb-1 font-semibold">Notification Outbox</h2>
          <p className="mb-4 text-sm text-muted">
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
      )}
    </div>
  );
}
