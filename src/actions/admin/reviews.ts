"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";

export async function moderateReviewAction(reviewId: string, status: "APPROVED" | "REJECTED") {
  const session = await requireRole(["MARKETING", "MANAGER", "ADMIN"]);
  await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await logAdminAction(session.sub, status === "APPROVED" ? "APPROVE" : "REJECT", "Review", reviewId);
  revalidatePath("/admin/reviews");
}
