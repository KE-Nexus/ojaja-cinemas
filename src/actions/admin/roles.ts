"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { Role } from "@prisma/client";

export type FormState = { error?: string; success?: boolean } | null;

// Managing permissions is restricted to Circuit Admin regardless of the "Can Create Roles"
// claim's toggle state — letting a lesser role grant/revoke claims (including its own) would
// be a privilege-escalation hole, so this gate is hardcoded rather than claim-driven.
export async function addClaimsToRoleAction(role: Role, claimIds: string[]) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  for (const claimId of claimIds) {
    await prisma.roleClaim.upsert({
      where: { role_claimId: { role, claimId } },
      update: {},
      create: { role, claimId },
    });
  }
  await logAdminAction(session.sub, "CREATE", "RoleClaim", role, { claimIds });
  revalidatePath("/admin/staff/roles");
}

export async function removeClaimsFromRoleAction(role: Role, claimIds: string[]) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  await prisma.roleClaim.deleteMany({ where: { role, claimId: { in: claimIds } } });
  await logAdminAction(session.sub, "DELETE", "RoleClaim", role, { claimIds });
  revalidatePath("/admin/staff/roles");
}

export async function createClaimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 3) return { error: "Enter a claim name." };

  const key = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
  if (!key) return { error: "Enter a claim name." };

  const existing = await prisma.claim.findUnique({ where: { key } });
  if (existing) return { error: "A claim with that name already exists." };

  const claim = await prisma.claim.create({ data: { key, label } });
  await logAdminAction(session.sub, "CREATE", "Claim", claim.id, { label });
  revalidatePath("/admin/staff/roles");
  return { success: true };
}
