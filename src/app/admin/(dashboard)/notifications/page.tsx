import Link from "next/link";
import { redirect } from "next/navigation";
import { X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { SeatClassSubscriptionsForm } from "@/components/admin/seat-class-subscriptions-form";
import { deleteNotificationAction, clearAllNotificationsAction } from "@/actions/admin/notifications";
import type { Prisma } from "@prisma/client";

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/admin");

  const canGetSeatClassAlerts = await hasClaim(session.role, "CAN_GET_SEAT_CLASS_NOTIFICATION");
  const canViewOutbox = session.role === "SUPERVISOR" || session.role === "CIRCUIT_ADMIN";
  if (!canGetSeatClassAlerts && !canViewOutbox) redirect("/admin");

  const outboxWhere: Prisma.NotificationOutboxWhereInput | undefined =
    canViewOutbox && q
      ? {
          OR: [
            { to: { contains: q, mode: "insensitive" } },
            { subject: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined;

  const [notifications, mySubscriptions] = await Promise.all([
    canViewOutbox ? prisma.notificationOutbox.findMany({ where: outboxWhere, orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
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
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Notification Outbox</h2>
            {notifications.length > 0 && (
              <DeleteButton
                action={clearAllNotificationsAction}
                confirmText="Clear every notification in the outbox? This cannot be undone."
              />
            )}
          </div>
          <p className="mb-4 text-sm text-muted">
            Simulated email/SMS sends for this demo build — swap <code>MockNotificationProvider</code> for a real
            Resend/Termii client to deliver these for real.
          </p>

          <form method="get" className="mb-4 flex items-center gap-2">
            <Input type="search" name="q" defaultValue={q ?? ""} placeholder="Search by recipient, subject, or message..." className="max-w-sm" />
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {q && (
              <Link href="/admin/notifications" className="flex items-center gap-1 text-sm text-muted hover:text-brand-light">
                <X size={14} /> Clear
              </Link>
            )}
          </form>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge tone={n.type === "EMAIL" ? "brand" : "gold"}>{n.type}</Badge>
                    <span className="text-sm font-medium">{n.to}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">{new Date(n.createdAt).toLocaleString("en-NG")}</span>
                    <DeleteButton action={deleteNotificationAction.bind(null, n.id)} confirmText="Delete this notification?" />
                  </div>
                </div>
                {n.type === "EMAIL" && <p className="text-sm font-medium">{n.subject}</p>}
                <p className="text-sm text-muted">{n.body}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-muted">{q ? "No notifications matched your search." : "No notifications sent yet."}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
