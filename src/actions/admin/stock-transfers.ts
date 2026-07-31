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

export async function createStockTransferAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT");
  if (claimError) return { error: claimError };

  const fromBranchId = String(formData.get("fromBranchId") ?? "");
  const toBranchId = String(formData.get("toBranchId") ?? "");
  if (!fromBranchId || !toBranchId) return { error: "Select both the source and destination cinema." };
  if (fromBranchId === toBranchId) return { error: "Source and destination cinemas must be different." };

  const accessError = await assertBranchAccess(session.sub, session.role, fromBranchId);
  if (accessError) return { error: accessError };

  const lines = parseLines(formData).filter((l) => l.posItemId && l.quantity > 0);
  if (lines.length === 0) return { error: "Add at least one line item with a valid quantity." };

  const items = await prisma.posItem.findMany({ where: { id: { in: lines.map((l) => l.posItemId) }, branchId: fromBranchId } });
  if (items.length !== new Set(lines.map((l) => l.posItemId)).size) return { error: "One or more items don't belong to the source cinema." };
  const insufficient = items.find((item) => {
    const line = lines.find((l) => l.posItemId === item.id);
    return line && item.stockOnHand < line.quantity;
  });
  if (insufficient) return { error: `Not enough stock on hand for "${insufficient.name}".` };

  const transfer = await prisma.stockTransferReceipt.create({
    data: {
      fromBranchId,
      toBranchId,
      initiatedById: session.sub,
      lines: { create: lines.map((l) => ({ posItemId: l.posItemId, quantity: l.quantity })) },
    },
  });

  await logAdminAction(session.sub, "CREATE", "StockTransferReceipt", transfer.id, { fromBranchId, toBranchId, lineCount: lines.length });
  revalidatePath("/admin/pos/stock-transfers");
  redirect("/admin/pos/stock-transfers");
}

// The destination branch approves receipt of the transferred stock — mirrors a real
// warehouse-to-branch handoff where the receiving side confirms what actually arrived.
export async function approveStockTransferAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_CREATE_APPROVE_STOCK_TRANSFER_RECEIPT");
  if (claimError) throw new Error(claimError);

  const transfer = await prisma.stockTransferReceipt.findUnique({
    where: { id },
    include: { lines: { include: { posItem: true } } },
  });
  if (!transfer) throw new Error("Stock transfer not found.");
  if (transfer.status !== "PENDING") throw new Error("This transfer has already been approved.");

  const accessError = await assertBranchAccess(session.sub, session.role, transfer.toBranchId);
  if (accessError) throw new Error(accessError);

  await prisma.$transaction(async (tx) => {
    for (const line of transfer.lines) {
      const sourceItem = line.posItem;
      if (sourceItem.stockOnHand < line.quantity) {
        throw new Error(`Not enough stock on hand for "${sourceItem.name}" at the source cinema.`);
      }

      let destItem = await tx.posItem.findFirst({
        where: { branchId: transfer.toBranchId, name: sourceItem.name, itemClass: sourceItem.itemClass, itemGroup: sourceItem.itemGroup },
      });
      if (!destItem) {
        destItem = await tx.posItem.create({
          data: {
            branchId: transfer.toBranchId,
            name: sourceItem.name,
            description: sourceItem.description,
            itemClass: sourceItem.itemClass,
            itemGroup: sourceItem.itemGroup,
            defaultPrice: sourceItem.defaultPrice,
          },
        });
      }

      await tx.posItem.update({ where: { id: sourceItem.id }, data: { stockOnHand: { decrement: line.quantity } } });
      await tx.posItem.update({ where: { id: destItem.id }, data: { stockOnHand: { increment: line.quantity } } });
    }

    await tx.stockTransferReceipt.update({ where: { id }, data: { status: "APPROVED", approvedById: session.sub, approvedAt: new Date() } });
  });

  await logAdminAction(session.sub, "UPDATE", "StockTransferReceipt", id, { decision: "APPROVED" });
  revalidatePath("/admin/pos/stock-transfers");
  revalidatePath("/admin/pos/items");
}
