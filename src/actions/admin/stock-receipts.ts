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

export async function createStockReceiptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_RECEIPT");
  if (claimError) return { error: claimError };

  const branchId = String(formData.get("branchId") ?? "");
  const stockRequestId = String(formData.get("stockRequestId") ?? "") || null;
  if (!branchId) return { error: "Select a cinema." };

  const accessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (accessError) return { error: accessError };

  if (stockRequestId) {
    const linkedRequest = await prisma.stockRequest.findUnique({ where: { id: stockRequestId } });
    if (!linkedRequest || linkedRequest.branchId !== branchId) return { error: "Linked stock request doesn't match this cinema." };
    if (linkedRequest.status !== "APPROVED") return { error: "Linked stock request must be approved first." };
  }

  const lines = parseLines(formData).filter((l) => l.posItemId && l.quantity > 0);
  if (lines.length === 0) return { error: "Add at least one line item with a valid quantity." };

  const items = await prisma.posItem.findMany({ where: { id: { in: lines.map((l) => l.posItemId) }, branchId } });
  if (items.length !== new Set(lines.map((l) => l.posItemId)).size) return { error: "One or more items don't belong to this cinema." };

  const receipt = await prisma.stockReceipt.create({
    data: {
      branchId,
      stockRequestId,
      receivedById: session.sub,
      lines: { create: lines.map((l) => ({ posItemId: l.posItemId, quantity: l.quantity })) },
    },
  });

  await logAdminAction(session.sub, "CREATE", "StockReceipt", receipt.id, { branchId, lineCount: lines.length });
  revalidatePath("/admin/pos/stock-receipts");
  redirect("/admin/pos/stock-receipts");
}

export async function approveStockReceiptAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_RECEIPT");
  if (claimError) throw new Error(claimError);

  const receipt = await prisma.stockReceipt.findUnique({ where: { id }, include: { lines: true } });
  if (!receipt) throw new Error("Stock receipt not found.");
  if (receipt.status !== "PENDING") throw new Error("This receipt has already been approved.");

  const accessError = await assertBranchAccess(session.sub, session.role, receipt.branchId);
  if (accessError) throw new Error(accessError);

  await prisma.$transaction(async (tx) => {
    for (const line of receipt.lines) {
      await tx.posItem.update({ where: { id: line.posItemId }, data: { stockOnHand: { increment: line.quantity } } });
    }
    await tx.stockReceipt.update({ where: { id }, data: { status: "APPROVED", approvedById: session.sub, approvedAt: new Date() } });
  });

  await logAdminAction(session.sub, "UPDATE", "StockReceipt", id, { decision: "APPROVED" });
  revalidatePath("/admin/pos/stock-receipts");
  revalidatePath("/admin/pos/items");
}
