"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import type { SpaceRequestStatus } from "@prisma/client";

export async function updateSpaceRequestStatusAction(id: string, status: SpaceRequestStatus) {
  const session = await requireRole(["ACCOUNTANT", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  await prisma.spaceBookingRequest.update({ where: { id }, data: { status } });
  await logAdminAction(session.sub, "UPDATE", "SpaceBookingRequest", id, { status });
  revalidatePath("/admin/space-requests");
}
