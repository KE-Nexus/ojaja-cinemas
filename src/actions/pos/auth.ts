"use server";

import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

export type PosLoginState = { error?: string; success?: boolean; redirectTo?: string } | null;

export async function posLoginAction(_prev: PosLoginState, formData: FormData): Promise<PosLoginState> {
  const staffNumber = String(formData.get("staffNumber") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!staffNumber) return { error: "Enter your user number." };
  if (!pin) return { error: "Enter your PIN." };

  const user = await prisma.user.findUnique({ where: { staffNumber } });
  if (!user || !user.isActive || !isStaffRole(user.role) || !user.pinHash) {
    return { error: "Invalid user number or PIN." };
  }

  const valid = await verifyPassword(pin, user.pinHash);
  if (!valid) return { error: "Invalid user number or PIN." };

  await createSession({ sub: user.id, role: user.role, name: user.name, email: user.email });
  // Returned instead of redirect()'d — the form shows a brief success state before
  // navigating itself, which a server-side redirect would cut off mid-render.
  return { success: true, redirectTo: "/pos" };
}
