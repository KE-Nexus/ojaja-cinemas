"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { priceCardSchema } from "@/lib/validation";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function parseForm(formData: FormData) {
  return priceCardSchema.safeParse({
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    description: formData.get("description") || "",
    days: formData.getAll("days"),
    isActive: formData.get("isActive") === "true",
  });
}

async function parseTicketIds(formData: FormData, branchId: string) {
  const ids = Array.from(new Set(formData.getAll("ticketId").map(String).filter(Boolean)));
  if (ids.length === 0) return { error: null, ids };

  const referenced = await prisma.ticketClass.findMany({ where: { id: { in: ids } } });
  if (referenced.length !== ids.length) return { error: "One or more tickets couldn't be found.", ids: null };
  if (referenced.some((t) => t.branchId !== branchId)) return { error: "Included tickets must belong to the same cinema.", ids: null };

  return { error: null, ids };
}

export async function createPriceCardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  const ticketResult = await parseTicketIds(formData, parsed.data.branchId);
  if (ticketResult.error) return { error: ticketResult.error };

  const priceCard = await prisma.priceCard.create({
    data: {
      branchId: parsed.data.branchId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      days: parsed.data.days,
      isActive: parsed.data.isActive,
      tickets: { create: (ticketResult.ids ?? []).map((ticketClassId) => ({ ticketClassId })) },
    },
  });

  await logAdminAction(session.sub, "CREATE", "PriceCard", priceCard.id);
  revalidatePath("/admin/movies/price-cards");
  redirect("/admin/movies/price-cards");
}

export async function updatePriceCardAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));
  const existing = await prisma.priceCard.findUnique({ where: { id } });
  if (!existing) return { error: "Price card not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
  if (accessError) return { error: accessError };

  const ticketResult = await parseTicketIds(formData, parsed.data.branchId);
  if (ticketResult.error) return { error: ticketResult.error };

  await prisma.$transaction(async (tx) => {
    await tx.priceCard.update({
      where: { id },
      data: {
        branchId: parsed.data.branchId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        days: parsed.data.days,
        isActive: parsed.data.isActive,
      },
    });

    await tx.priceCardTicket.deleteMany({ where: { priceCardId: id } });
    const ids = ticketResult.ids ?? [];
    if (ids.length > 0) {
      await tx.priceCardTicket.createMany({ data: ids.map((ticketClassId) => ({ priceCardId: id, ticketClassId })) });
    }
  });

  await logAdminAction(session.sub, "UPDATE", "PriceCard", id);
  revalidatePath("/admin/movies/price-cards");
  redirect("/admin/movies/price-cards");
}

export async function togglePriceCardAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) throw new Error(claimError);

  const priceCard = await prisma.priceCard.findUnique({ where: { id } });
  if (!priceCard) return;
  if (await assertBranchAccess(session.sub, session.role, priceCard.branchId)) return;

  await prisma.priceCard.update({ where: { id }, data: { isActive: !priceCard.isActive } });
  await logAdminAction(session.sub, "UPDATE", "PriceCard", id, { isActive: !priceCard.isActive });
  revalidatePath("/admin/movies/price-cards");
}

export async function deletePriceCardAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_PRICECARDS");
  if (claimError) throw new Error(claimError);

  const priceCard = await prisma.priceCard.findUnique({ where: { id } });
  if (!priceCard) return;
  if (await assertBranchAccess(session.sub, session.role, priceCard.branchId)) return;

  await prisma.priceCard.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "PriceCard", id);
  revalidatePath("/admin/movies/price-cards");
}
