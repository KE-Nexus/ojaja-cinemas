"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

const STAFF_ROLES: Role[] = ["TICKETER", "SUPERVISOR", "ACCOUNTANT", "TECHNICIAN", "AUDITOR", "DRIVER", "CIRCUIT_ADMIN"];

export async function adjustLoyaltyPointsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY");
  if (claimError) return { error: claimError };

  const userId = String(formData.get("userId") ?? "");
  const delta = Number(formData.get("delta"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!userId) return { error: "Select a customer." };
  if (!Number.isFinite(delta) || delta === 0) return { error: "Enter a non-zero point amount." };
  if (!reason) return { error: "Enter a reason for this adjustment." };

  const customer = await prisma.user.findUnique({ where: { id: userId } });
  if (!customer || customer.role !== "CUSTOMER") return { error: "Customer not found." };
  if (customer.loyaltyPoints + delta < 0) return { error: "This would take the customer's balance below zero." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: delta } } });
    await tx.loyaltyAdjustment.create({ data: { userId, delta, reason, adjustedById: session.sub } });
  });

  await logAdminAction(session.sub, "UPDATE", "LoyaltyPoints", userId, { delta, reason });
  revalidatePath("/admin/loyalty");
  return null;
}

export async function createLoyaltyTierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) return { error: claimError };

  const name = String(formData.get("name") ?? "").trim();
  const minPoints = Number(formData.get("minPoints"));
  const perks = String(formData.get("perks") ?? "").trim();

  if (!name) return { error: "Enter a tier name." };
  if (!Number.isFinite(minPoints) || minPoints < 0) return { error: "Enter a valid minimum points threshold." };

  const tier = await prisma.loyaltyTier.create({ data: { name, minPoints, perks: perks || null } });
  await logAdminAction(session.sub, "CREATE", "LoyaltyTier", tier.id, { name, minPoints });
  revalidatePath("/admin/loyalty/plus");
  redirect("/admin/loyalty/plus");
}

export async function deleteLoyaltyTierAction(id: string) {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) throw new Error(claimError);

  await prisma.loyaltyTier.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "LoyaltyTier", id);
  revalidatePath("/admin/loyalty/plus");
}

export async function createLoyaltyRewardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) return { error: claimError };

  const name = String(formData.get("name") ?? "").trim();
  const pointsCost = Number(formData.get("pointsCost"));
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Enter a reward name." };
  if (!Number.isFinite(pointsCost) || pointsCost <= 0) return { error: "Enter a valid points cost." };

  const reward = await prisma.loyaltyReward.create({ data: { name, pointsCost, description: description || null } });
  await logAdminAction(session.sub, "CREATE", "LoyaltyReward", reward.id, { name, pointsCost });
  revalidatePath("/admin/loyalty/plus");
  redirect("/admin/loyalty/plus");
}

export async function toggleLoyaltyRewardAction(id: string, isActive: boolean) {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) throw new Error(claimError);

  await prisma.loyaltyReward.update({ where: { id }, data: { isActive } });
  await logAdminAction(session.sub, "UPDATE", "LoyaltyReward", id, { isActive });
  revalidatePath("/admin/loyalty/plus");
}

export async function deleteLoyaltyRewardAction(id: string) {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) throw new Error(claimError);

  await prisma.loyaltyReward.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "LoyaltyReward", id);
  revalidatePath("/admin/loyalty/plus");
}

export async function redeemLoyaltyRewardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_ACCESS_LOYALTY_PLUS");
  if (claimError) return { error: claimError };

  const userId = String(formData.get("userId") ?? "");
  const rewardId = String(formData.get("rewardId") ?? "");
  if (!userId || !rewardId) return { error: "Select a customer and a reward." };

  const [customer, reward] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.loyaltyReward.findUnique({ where: { id: rewardId } }),
  ]);
  if (!customer || customer.role !== "CUSTOMER") return { error: "Customer not found." };
  if (!reward || !reward.isActive) return { error: "Reward not found or no longer active." };
  if (customer.loyaltyPoints < reward.pointsCost) return { error: "Customer doesn't have enough points for this reward." };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { decrement: reward.pointsCost } } });
    await tx.loyaltyRedemption.create({
      data: { userId, rewardId, pointsSpent: reward.pointsCost, redeemedById: session.sub },
    });
  });

  await logAdminAction(session.sub, "CREATE", "LoyaltyRedemption", userId, { rewardId, pointsSpent: reward.pointsCost });
  revalidatePath("/admin/loyalty/plus");
  return null;
}
