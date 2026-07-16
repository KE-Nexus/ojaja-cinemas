"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { showtimeSchema } from "@/lib/validation";

export type SessionFormState = { error?: string; success?: boolean } | null;

export async function createSessionAction(_prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const parsed = showtimeSchema.safeParse({
    movieId: formData.get("movieId"),
    auditoriumId: formData.get("auditoriumId"),
    startTime: formData.get("startTime"),
    basePrice: formData.get("basePrice"),
    language: formData.get("language"),
    format: formData.get("format"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const startTime = new Date(parsed.data.startTime);

  const conflict = await prisma.showtime.findFirst({
    where: { auditoriumId: parsed.data.auditoriumId, startTime },
  });
  if (conflict) return { error: "This room already has a session scheduled at that time." };

  const showtime = await prisma.showtime.create({ data: { ...parsed.data, startTime } });

  await logAdminAction(session.sub, "CREATE", "Showtime", showtime.id);
  revalidatePath("/admin/scheduling");
  return { success: true };
}

export async function deleteSessionAction(id: string) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  await prisma.showtime.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Showtime", id);
  revalidatePath("/admin/scheduling");
}

export async function deleteDaySessionsAction(auditoriumIds: string[], dayStart: string, dayEnd: string) {
  const session = await requireRole(["MANAGER", "ADMIN"]);
  const { count } = await prisma.showtime.deleteMany({
    where: {
      auditoriumId: { in: auditoriumIds },
      startTime: { gte: new Date(dayStart), lt: new Date(dayEnd) },
    },
  });
  await logAdminAction(session.sub, "DELETE", "Showtime", "bulk-day", { count });
  revalidatePath("/admin/scheduling");
  return count;
}

export async function duplicateDayAction(auditoriumIds: string[], fromDayStart: string, toDayStart: string) {
  const session = await requireRole(["MANAGER", "ADMIN"]);

  const fromStart = new Date(fromDayStart);
  const fromEnd = new Date(fromStart.getTime() + 24 * 60 * 60 * 1000);
  const toStart = new Date(toDayStart);
  const dayOffsetMs = toStart.getTime() - fromStart.getTime();

  const sourceSessions = await prisma.showtime.findMany({
    where: { auditoriumId: { in: auditoriumIds }, startTime: { gte: fromStart, lt: fromEnd } },
  });

  let created = 0;
  for (const s of sourceSessions) {
    const newStart = new Date(s.startTime.getTime() + dayOffsetMs);
    const conflict = await prisma.showtime.findFirst({
      where: { auditoriumId: s.auditoriumId, startTime: newStart },
    });
    if (conflict) continue;

    await prisma.showtime.create({
      data: {
        movieId: s.movieId,
        auditoriumId: s.auditoriumId,
        startTime: newStart,
        basePrice: s.basePrice,
        language: s.language,
        format: s.format,
      },
    });
    created++;
  }

  await logAdminAction(session.sub, "CREATE", "Showtime", "bulk-duplicate", { created, from: fromDayStart, to: toDayStart });
  revalidatePath("/admin/scheduling");
  return created;
}
