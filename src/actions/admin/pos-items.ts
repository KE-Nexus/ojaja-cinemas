"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { posItemSchema } from "@/lib/validation";
import { assertBranchAccess } from "@/lib/branch-scope";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

function parseForm(formData: FormData) {
  return posItemSchema.safeParse({
    branchId: formData.get("branchId") || "",
    name: formData.get("name"),
    description: formData.get("description") || "",
    itemClass: formData.get("itemClass"),
    itemGroup: formData.get("itemGroup"),
    defaultPrice: formData.get("defaultPrice"),
  });
}

// "All Items" (per-location) requires a branch; "HO Items" is always branchId: null —
// the create pages call this with `requireBranch` set accordingly.
export async function createPosItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_ITEMS");
  if (claimError) return { error: claimError };

  const requireBranch = formData.get("requireBranch") === "true";
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  if (requireBranch && !parsed.data.branchId) return { error: "Select a cinema" };

  if (parsed.data.branchId) {
    const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
    if (accessError) return { error: accessError };
  }

  const item = await prisma.posItem.create({
    data: { ...parsed.data, branchId: parsed.data.branchId || null, description: parsed.data.description || null },
  });

  await logAdminAction(session.sub, "CREATE", "PosItem", item.id);
  revalidatePath("/admin/pos/ho-items");
  revalidatePath("/admin/pos/items");
  redirect(requireBranch ? "/admin/pos/items" : "/admin/pos/ho-items");
}

export async function updatePosItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_ITEMS");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));
  const requireBranch = formData.get("requireBranch") === "true";
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  if (requireBranch && !parsed.data.branchId) return { error: "Select a cinema" };

  if (parsed.data.branchId) {
    const accessError = await assertBranchAccess(session.sub, session.role, parsed.data.branchId);
    if (accessError) return { error: accessError };
  }

  await prisma.posItem.update({
    where: { id },
    data: { ...parsed.data, branchId: parsed.data.branchId || null, description: parsed.data.description || null },
  });

  await logAdminAction(session.sub, "UPDATE", "PosItem", id);
  revalidatePath("/admin/pos/ho-items");
  revalidatePath("/admin/pos/items");
  redirect(requireBranch ? "/admin/pos/items" : "/admin/pos/ho-items");
}

export async function deletePosItemAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_ITEMS");
  if (claimError) throw new Error(claimError);

  const item = await prisma.posItem.findUnique({ where: { id } });
  if (!item) return;
  if (item.branchId && (await assertBranchAccess(session.sub, session.role, item.branchId))) return;

  await prisma.posItem.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "PosItem", id);
  revalidatePath("/admin/pos/ho-items");
  revalidatePath("/admin/pos/items");
}
