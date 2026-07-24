"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export type FormState = { error?: string; success?: boolean } | null;

export async function openStaffSessionAction(): Promise<FormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);

  const me = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!me?.branchId) return { error: "You need to be assigned to a cinema before opening a session." };

  const existing = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (existing) return { error: "You already have an open session." };

  const staffSession = await prisma.staffSession.create({ data: { staffId: session.sub, branchId: me.branchId } });

  await logAdminAction(session.sub, "CREATE", "StaffSession", staffSession.id);
  revalidatePath("/admin/staff/sessions");
  return null;
}

export async function closeStaffSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));

  const staffSession = await prisma.staffSession.findUnique({ where: { id } });
  if (!staffSession || staffSession.status !== "OPEN") return { error: "This session is already closed." };

  const parseAmount = (key: string) => {
    const raw = formData.get(key);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  await prisma.staffSession.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById: session.sub,
      actualCard: parseAmount("actualCard"),
      actualCash: parseAmount("actualCash"),
      actualTransfer: parseAmount("actualTransfer"),
      actualVoucher: parseAmount("actualVoucher"),
    },
  });

  await logAdminAction(session.sub, "UPDATE", "StaffSession", id, { action: "close" });
  revalidatePath("/admin/staff/sessions");
  return { success: true };
}
