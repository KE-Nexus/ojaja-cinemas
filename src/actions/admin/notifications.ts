"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function deleteNotificationAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);

  await prisma.notificationOutbox.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "NotificationOutbox", id);
  revalidatePath("/admin/notifications");
}

export async function clearAllNotificationsAction() {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);

  const { count } = await prisma.notificationOutbox.deleteMany({});
  await logAdminAction(session.sub, "DELETE", "NotificationOutbox", "bulk-clear", { count });
  revalidatePath("/admin/notifications");
}
