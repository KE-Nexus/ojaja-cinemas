"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { notificationProvider } from "@/lib/providers/notification";
import {
  inviteStaffSchema,
  staffEmailSchema,
  staffPasswordSchema,
  staffPinSchema,
  transferStaffSchema,
} from "@/lib/validation";
import type { Role } from "@prisma/client";

export type FormState = { error?: string; success?: boolean } | null;

const STAFF_ROLES: Role[] = ["TICKETER", "ACCOUNTANT", "SUPERVISOR", "TECHNICIAN", "AUDITOR", "CIRCUIT_ADMIN"];

function randomTempPassword() {
  return Math.random().toString(36).slice(2, 10) + "!A1";
}

export async function inviteStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = inviteStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    branchId: formData.get("branchId") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with that email already exists." };

  const tempPassword = randomTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const staffCount = await prisma.user.count({ where: { role: { in: STAFF_ROLES } } });
  const staffNumber = `STF-${String(staffCount + 1).padStart(4, "0")}`;

  const staff = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      role: parsed.data.role,
      branchId: parsed.data.branchId || null,
      staffNumber,
      passwordHash,
    },
  });

  await notificationProvider.sendEmail(
    staff.email,
    "You've been invited to OJAJA Office",
    `Hi ${staff.name}, you've been added as ${staff.role.replace("_", " ")} (${staffNumber}). Sign in at /admin/login with email ${staff.email} and temporary password ${tempPassword}. You'll be asked to change it on first use.`
  );

  await logAdminAction(session.sub, "CREATE", "User", staff.id, { role: staff.role, staffNumber });
  revalidatePath("/admin/staff");
  return { success: true };
}

export async function toggleStaffStatusAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staff = await prisma.user.findUnique({ where: { id } });
  if (!staff) return;
  await prisma.user.update({ where: { id }, data: { isActive: !staff.isActive } });
  await logAdminAction(session.sub, "UPDATE", "User", id, { isActive: !staff.isActive });
  revalidatePath("/admin/staff");
}

export async function updateStaffEmailAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = staffEmailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== id) return { error: "A user with that email already exists." };

  await prisma.user.update({ where: { id }, data: { email: parsed.data.email } });
  await logAdminAction(session.sub, "UPDATE", "User", id, { action: "email-change" });
  revalidatePath("/admin/staff");
  return { success: true };
}

export async function updateStaffPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = staffPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  await logAdminAction(session.sub, "UPDATE", "User", id, { action: "password-reset" });
  revalidatePath("/admin/staff");
  return { success: true };
}

export async function updateStaffPinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = staffPinSchema.safeParse({ pin: formData.get("pin") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const pinHash = await hashPassword(parsed.data.pin);
  await prisma.user.update({ where: { id }, data: { pinHash } });
  await logAdminAction(session.sub, "UPDATE", "User", id, { action: "pin-reset" });
  revalidatePath("/admin/staff");
  return { success: true };
}

export async function transferStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const id = String(formData.get("id"));
  const parsed = transferStaffSchema.safeParse({ branchId: formData.get("branchId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  await prisma.user.update({ where: { id }, data: { branchId: parsed.data.branchId } });
  await logAdminAction(session.sub, "UPDATE", "User", id, { action: "transfer", branchId: parsed.data.branchId });
  revalidatePath("/admin/staff");
  return { success: true };
}
