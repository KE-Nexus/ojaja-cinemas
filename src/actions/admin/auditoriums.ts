"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { auditoriumSchema } from "@/lib/validation";
import type { SeatCategory } from "@prisma/client";

export type FormState = { error?: string } | null;

export async function createAuditoriumAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "TECHNICIAN"]);
  const parsed = auditoriumSchema.safeParse({
    branchId: formData.get("branchId"),
    name: formData.get("name"),
    screenType: formData.get("screenType"),
    rows: formData.get("rows"),
    seatsPerRow: formData.get("seatsPerRow"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const auditorium = await prisma.auditorium.create({ data: parsed.data });

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, parsed.data.rows).split("");
  const seats: { auditoriumId: string; row: string; number: number; category: SeatCategory }[] = [];
  rowLetters.forEach((row, rowIndex) => {
    for (let n = 1; n <= parsed.data.seatsPerRow; n++) {
      let category: SeatCategory = "STANDARD";
      if (parsed.data.screenType === "Recliner Suite") category = "RECLINER";
      else if (rowIndex >= parsed.data.rows - 2) category = "PREMIUM";
      if (row === rowLetters[0] && (n === 1 || n === parsed.data.seatsPerRow)) category = "ACCESSIBLE";
      seats.push({ auditoriumId: auditorium.id, row, number: n, category });
    }
  });
  await prisma.seat.createMany({ data: seats });

  await logAdminAction(session.sub, "CREATE", "Auditorium", auditorium.id, { name: auditorium.name });
  revalidatePath("/admin/auditoriums");
  redirect("/admin/auditoriums");
}

export async function updateSeatCategoryAction(seatId: string, category: SeatCategory) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "TECHNICIAN"]);
  const seat = await prisma.seat.update({ where: { id: seatId }, data: { category } });
  await logAdminAction(session.sub, "UPDATE", "Seat", seatId, { category });
  revalidatePath(`/admin/auditoriums/${seat.auditoriumId}`);
}

export async function deleteAuditoriumAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN", "TECHNICIAN"]);
  await prisma.auditorium.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Auditorium", id);
  revalidatePath("/admin/auditoriums");
}
