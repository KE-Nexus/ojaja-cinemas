"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { promoCodeSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

export async function createPromoCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["ACCOUNTANT", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = promoCodeSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    expiresAt: formData.get("expiresAt") || "",
    usageLimit: formData.get("usageLimit") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const existing = await prisma.promoCode.findUnique({ where: { code: parsed.data.code.toUpperCase() } });
  if (existing) return { error: "A promo code with this name already exists." };

  const promo = await prisma.promoCode.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      usageLimit: parsed.data.usageLimit || null,
    },
  });

  await logAdminAction(session.sub, "CREATE", "PromoCode", promo.id, { code: promo.code });
  revalidatePath("/admin/promo-codes");
  return null;
}

export async function togglePromoCodeAction(id: string) {
  const session = await requireRole(["ACCOUNTANT", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) return;
  await prisma.promoCode.update({ where: { id }, data: { isActive: !promo.isActive } });
  await logAdminAction(session.sub, "UPDATE", "PromoCode", id, { isActive: !promo.isActive });
  revalidatePath("/admin/promo-codes");
}

export async function deletePromoCodeAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  await prisma.promoCode.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "PromoCode", id);
  revalidatePath("/admin/promo-codes");
}
