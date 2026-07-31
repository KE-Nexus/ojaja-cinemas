"use server";

import { revalidatePath } from "next/cache";
import type { SeatCategory, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { assertHasClaim } from "@/lib/claims";

const STAFF_ROLES: Role[] = ["TICKETER", "SUPERVISOR", "ACCOUNTANT", "TECHNICIAN", "AUDITOR", "DRIVER", "CIRCUIT_ADMIN"];

export async function setSeatClassSubscriptionAction(category: SeatCategory, subscribed: boolean) {
  const session = await requireRole(STAFF_ROLES);
  const claimError = await assertHasClaim(session.role, "CAN_GET_SEAT_CLASS_NOTIFICATION");
  if (claimError) throw new Error(claimError);

  if (subscribed) {
    await prisma.seatClassSubscription.upsert({
      where: { userId_category: { userId: session.sub, category } },
      update: {},
      create: { userId: session.sub, category },
    });
  } else {
    await prisma.seatClassSubscription.deleteMany({ where: { userId: session.sub, category } });
  }

  revalidatePath("/admin/notifications");
}
