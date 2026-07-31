"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function parseLines(formData: FormData) {
  const posItemIds = formData.getAll("posItemId").map(String);
  const quantities = formData.getAll("quantity").map((q) => Number(q));
  return posItemIds.map((posItemId, i) => ({ posItemId, quantity: quantities[i] }));
}

export async function createStockRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_REQUEST");
  if (claimError) return { error: claimError };

  const branchId = String(formData.get("branchId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!branchId) return { error: "Select a cinema." };

  const accessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (accessError) return { error: accessError };

  const lines = parseLines(formData).filter((l) => l.posItemId && l.quantity > 0);
  if (lines.length === 0) return { error: "Add at least one line item with a valid quantity." };

  const items = await prisma.posItem.findMany({ where: { id: { in: lines.map((l) => l.posItemId) }, branchId } });
  if (items.length !== new Set(lines.map((l) => l.posItemId)).size) return { error: "One or more items don't belong to this cinema." };

  const request = await prisma.stockRequest.create({
    data: {
      branchId,
      requestedById: session.sub,
      note: note || null,
      lines: { create: lines.map((l) => ({ posItemId: l.posItemId, quantity: l.quantity })) },
    },
  });

  await logAdminAction(session.sub, "CREATE", "StockRequest", request.id, { branchId, lineCount: lines.length });
  revalidatePath("/admin/pos/stock-requests");
  redirect("/admin/pos/stock-requests");
}

export async function decideStockRequestAction(id: string, approve: boolean) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_REQUEST");
  if (claimError) throw new Error(claimError);

  const request = await prisma.stockRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Stock request not found.");
  if (request.status !== "PENDING") throw new Error("This request has already been decided.");

  const accessError = await assertBranchAccess(session.sub, session.role, request.branchId);
  if (accessError) throw new Error(accessError);

  await prisma.stockRequest.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", approvedById: session.sub, approvedAt: new Date() },
  });

  await logAdminAction(session.sub, "UPDATE", "StockRequest", id, { decision: approve ? "APPROVED" : "REJECTED" });
  revalidatePath("/admin/pos/stock-requests");
}
