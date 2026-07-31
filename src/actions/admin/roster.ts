"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { notificationProvider } from "@/lib/providers/notification";
import { rosterShiftSchema } from "@/lib/validation";
import { assertBranchAccess } from "@/lib/branch-scope";

export type FormState = { error?: string; success?: boolean } | null;

export async function createRosterShiftAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = rosterShiftSchema.safeParse({
    staffId: formData.get("staffId"),
    branchId: formData.get("branchId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  const date = new Date(`${parsed.data.date}T00:00:00`);

  const shift = await prisma.rosterShift.upsert({
    where: { staffId_date: { staffId: parsed.data.staffId, date } },
    update: { startTime: parsed.data.startTime, endTime: parsed.data.endTime, branchId: parsed.data.branchId },
    create: {
      staffId: parsed.data.staffId,
      branchId: parsed.data.branchId,
      date,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    },
  });

  await logAdminAction(session.sub, "CREATE", "RosterShift", shift.id);
  revalidatePath("/admin/staff/roster");
  return { success: true };
}

export async function deleteRosterShiftAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const shift = await prisma.rosterShift.findUnique({ where: { id } });
  if (!shift) return;
  if (await assertBranchAccess(session.sub, session.role, shift.branchId)) return;

  await prisma.rosterShift.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "RosterShift", id);
  revalidatePath("/admin/staff/roster");
}

export async function duplicateRosterWeekAction(branchId: string, fromWeekStartISO: string, toWeekStartISO: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const accessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (accessError) throw new Error(accessError);

  const fromStart = new Date(fromWeekStartISO);
  const fromEnd = new Date(fromStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const toStart = new Date(toWeekStartISO);
  const dayOffsetMs = toStart.getTime() - fromStart.getTime();

  const sourceShifts = await prisma.rosterShift.findMany({
    where: { branchId, date: { gte: fromStart, lt: fromEnd } },
  });

  let created = 0;
  for (const shift of sourceShifts) {
    const newDate = new Date(shift.date.getTime() + dayOffsetMs);
    const conflict = await prisma.rosterShift.findUnique({
      where: { staffId_date: { staffId: shift.staffId, date: newDate } },
    });
    if (conflict) continue;

    await prisma.rosterShift.create({
      data: { staffId: shift.staffId, branchId, date: newDate, startTime: shift.startTime, endTime: shift.endTime },
    });
    created++;
  }

  await logAdminAction(session.sub, "CREATE", "RosterShift", "bulk-duplicate", { created, from: fromWeekStartISO, to: toWeekStartISO });
  revalidatePath("/admin/staff/roster");
  return created;
}

export async function sendRosterAction(branchId: string, weekStartISO: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const accessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (accessError) throw new Error(accessError);

  const weekStart = new Date(weekStartISO);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const shifts = await prisma.rosterShift.findMany({
    where: { branchId, date: { gte: weekStart, lt: weekEnd } },
    include: { staff: true },
    orderBy: { date: "asc" },
  });

  const byStaff = new Map<string, { name: string; email: string; lines: string[] }>();
  for (const shift of shifts) {
    const entry = byStaff.get(shift.staffId) ?? { name: shift.staff.name, email: shift.staff.email, lines: [] };
    entry.lines.push(
      `${shift.date.toLocaleDateString("en-NG", { weekday: "long", day: "2-digit", month: "short" })}: ${shift.startTime}–${shift.endTime}`
    );
    byStaff.set(shift.staffId, entry);
  }

  for (const { name, email, lines } of byStaff.values()) {
    await notificationProvider.sendEmail(
      email,
      "Your roster for this week",
      `Hi ${name}, here's your schedule:\n\n${lines.join("\n")}`
    );
  }

  await logAdminAction(session.sub, "UPDATE", "RosterShift", "bulk-send", { staffNotified: byStaff.size, weekStart: weekStartISO });
  return byStaff.size;
}
