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
  const unitCosts = formData.getAll("unitCost").map((c) => Number(c));
  return posItemIds.map((posItemId, i) => ({ posItemId, quantity: quantities[i], unitCost: unitCosts[i] }));
}

export async function createPurchaseOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);

  const branchId = String(formData.get("branchId") ?? "");
  const supplierName = String(formData.get("supplierName") ?? "").trim();
  if (!branchId) return { error: "Select a cinema." };
  if (!supplierName) return { error: "Enter a supplier name." };

  const accessError = await assertBranchAccess(session.sub, session.role, branchId);
  if (accessError) return { error: accessError };

  const lines = parseLines(formData).filter((l) => l.posItemId && l.quantity > 0 && l.unitCost >= 0);
  if (lines.length === 0) return { error: "Add at least one line item with a valid quantity and unit cost." };

  const items = await prisma.posItem.findMany({ where: { id: { in: lines.map((l) => l.posItemId) }, branchId } });
  if (items.length !== new Set(lines.map((l) => l.posItemId)).size) return { error: "One or more items don't belong to this cinema." };

  const order = await prisma.purchaseOrder.create({
    data: {
      branchId,
      supplierName,
      createdById: session.sub,
      lines: { create: lines.map((l) => ({ posItemId: l.posItemId, quantity: l.quantity, unitCost: l.unitCost })) },
    },
  });

  await logAdminAction(session.sub, "CREATE", "PurchaseOrder", order.id, { branchId, supplierName, lineCount: lines.length });
  revalidatePath("/admin/pos/purchase-orders");
  redirect("/admin/pos/purchase-orders");
}

// Approval here is a financial authorization gate only — receiving the ordered goods
// is a separate, later Stock Receipt once the supplier actually delivers.
export async function decidePurchaseOrderAction(id: string, approve: boolean) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_APPROVE_PURCHASE_ORDER");
  if (claimError) throw new Error(claimError);

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) throw new Error("Purchase order not found.");
  if (order.status !== "PENDING") throw new Error("This purchase order has already been decided.");

  const accessError = await assertBranchAccess(session.sub, session.role, order.branchId);
  if (accessError) throw new Error(accessError);

  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: approve ? "APPROVED" : "REJECTED", approvedById: session.sub, approvedAt: new Date() },
  });

  await logAdminAction(session.sub, "UPDATE", "PurchaseOrder", id, { decision: approve ? "APPROVED" : "REJECTED" });
  revalidatePath("/admin/pos/purchase-orders");
}
