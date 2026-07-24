"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { showtimeSchema } from "@/lib/validation";

export type FormState = { error?: string } | null;

export async function createShowtimeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const parsed = showtimeSchema.safeParse({
    movieId: formData.get("movieId"),
    auditoriumId: formData.get("auditoriumId"),
    startTime: formData.get("startTime"),
    basePrice: formData.get("basePrice"),
    language: formData.get("language"),
    format: formData.get("format"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const showtime = await prisma.showtime.create({
    data: { ...parsed.data, startTime: new Date(parsed.data.startTime) },
  });

  await logAdminAction(session.sub, "CREATE", "Showtime", showtime.id);
  revalidatePath("/admin/showtimes");
  redirect("/admin/showtimes");
}

export async function deleteShowtimeAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  await prisma.showtime.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Showtime", id);
  revalidatePath("/admin/showtimes");
}
