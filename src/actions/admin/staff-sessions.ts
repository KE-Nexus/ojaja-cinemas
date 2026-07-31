"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string; success?: boolean } | null;

export async function openStaffSessionAction(): Promise<FormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_MANUALLY_OPEN_POS_CASH_DRAWER");
  if (claimError) return { error: claimError };

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
  const claimError = await assertHasClaim(session.role, "CAN_CLOSE_SESSIONS");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));

  const staffSession = await prisma.staffSession.findUnique({ where: { id } });
  if (!staffSession || staffSession.status !== "OPEN") return { error: "This session is already closed." };

  const accessError = await assertBranchAccess(session.sub, session.role, staffSession.branchId);
  if (accessError) return { error: accessError };

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

export async function reopenStaffSessionAction(id: string): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_REOPEN_SESSIONS");
  if (claimError) return { error: claimError };

  const staffSession = await prisma.staffSession.findUnique({ where: { id } });
  if (!staffSession || staffSession.status !== "CLOSED") return { error: "This session isn't closed." };

  const accessError = await assertBranchAccess(session.sub, session.role, staffSession.branchId);
  if (accessError) return { error: accessError };

  await prisma.staffSession.update({
    where: { id },
    data: { status: "OPEN", closedAt: null, closedById: null, actualCard: null, actualCash: null, actualTransfer: null, actualVoucher: null },
  });

  await logAdminAction(session.sub, "UPDATE", "StaffSession", id, { action: "reopen" });
  revalidatePath("/admin/staff/sessions");
  return { success: true };
}
