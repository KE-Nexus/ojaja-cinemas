"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { Role } from "@prisma/client";

export async function updateUserRoleAction(userId: string, role: Role) {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAdminAction(session.sub, "UPDATE", "User", userId, { role });
  revalidatePath("/admin/users");
}
