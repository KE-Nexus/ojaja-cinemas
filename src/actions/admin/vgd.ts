"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function generateVgdCode(): string {
  return `VGD-${nanoid(8).toUpperCase()}`;
}

export async function issueVgdAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_VGD");
  if (claimError) return { error: claimError };

  const type = String(formData.get("type") ?? "");
  const branchId = String(formData.get("branchId") ?? "") || null;
  const value = Number(formData.get("value"));
  const isPercent = formData.get("isPercent") === "on";
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const expiresAt = String(formData.get("expiresAt") ?? "");

  if (!["VOUCHER", "GIFT_CARD", "DISCOUNT"].includes(type)) return { error: "Select a valid type." };
  if (!value || value <= 0) return { error: "Enter a valid value." };
  if (isPercent && value > 100) return { error: "A percentage discount can't exceed 100%." };
  if (!branchId && session.role !== "CIRCUIT_ADMIN") return { error: "Select a cinema." };

  if (branchId) {
    const accessError = await assertBranchAccess(session.sub, session.role, branchId);
    if (accessError) return { error: accessError };
  }

  let code = generateVgdCode();
  while (await prisma.vgdRecord.findUnique({ where: { code } })) {
    code = generateVgdCode();
  }

  const record = await prisma.vgdRecord.create({
    data: {
      type: type as "VOUCHER" | "GIFT_CARD" | "DISCOUNT",
      code,
      value,
      isPercent,
      branchId,
      issuedById: session.sub,
      recipientName: recipientName || null,
      note: note || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await logAdminAction(session.sub, "CREATE", "VgdRecord", record.id, { type, code, value });
  revalidatePath("/admin/vgd");
  redirect("/admin/vgd");
}

export async function redeemVgdAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_VGD");
  if (claimError) return { error: claimError };

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter a code." };

  const record = await prisma.vgdRecord.findUnique({ where: { code } });
  if (!record) return { error: "No voucher/gift/discount found with that code." };

  if (record.branchId) {
    const accessError = await assertBranchAccess(session.sub, session.role, record.branchId);
    if (accessError) return { error: "This code isn't valid at your cinema." };
  }

  if (record.status === "REDEEMED") return { error: "This code has already been redeemed." };
  if (record.status === "CANCELLED") return { error: "This code has been cancelled." };
  if (record.expiresAt && record.expiresAt < new Date()) {
    await prisma.vgdRecord.update({ where: { id: record.id }, data: { status: "EXPIRED" } });
    return { error: "This code has expired." };
  }

  await prisma.vgdRecord.update({
    where: { id: record.id },
    data: { status: "REDEEMED", redeemedById: session.sub, redeemedAt: new Date() },
  });

  await logAdminAction(session.sub, "UPDATE", "VgdRecord", record.id, { action: "redeemed" });
  revalidatePath("/admin/vgd");
  redirect("/admin/vgd");
}

export async function cancelVgdAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_VGD");
  if (claimError) throw new Error(claimError);

  const record = await prisma.vgdRecord.findUnique({ where: { id } });
  if (!record) throw new Error("Record not found.");
  if (record.branchId) {
    const accessError = await assertBranchAccess(session.sub, session.role, record.branchId);
    if (accessError) throw new Error(accessError);
  }
  if (record.status !== "ACTIVE") throw new Error("Only active codes can be cancelled.");

  await prisma.vgdRecord.update({ where: { id }, data: { status: "CANCELLED" } });
  await logAdminAction(session.sub, "UPDATE", "VgdRecord", id, { action: "cancelled" });
  revalidatePath("/admin/vgd");
}
