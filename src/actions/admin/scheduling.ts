"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { filmSessionBatchSchema, filmSessionRowSchema } from "@/lib/validation";
import { assertHasClaim } from "@/lib/claims";
import { assertBranchAccess } from "@/lib/branch-scope";
import { parseWatDateTimeLocal } from "@/lib/format";
import { ensureFilmContract } from "@/actions/admin/film-contracts";

export type SessionFormState = { error?: string; success?: boolean } | null;

const FALLBACK_BASE_PRICE = 3500;

/** A session's price is driven by its Price Card: the Standard-seat ticket if tagged, otherwise the cheapest included ticket. */
async function resolveBasePrice(priceCardId: string | null): Promise<number> {
  if (!priceCardId) return FALLBACK_BASE_PRICE;
  const lines = await prisma.priceCardTicket.findMany({
    where: { priceCardId },
    include: { ticketClass: true },
  });
  if (lines.length === 0) return FALLBACK_BASE_PRICE;
  const standard = lines.find((l) => l.ticketClass.seatClass === "STANDARD");
  if (standard) return standard.ticketClass.defaultPrice;
  return Math.min(...lines.map((l) => l.ticketClass.defaultPrice));
}

export async function createFilmSessionsAction(_prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) return { error: claimError };

  const batchParsed = filmSessionBatchSchema.safeParse({
    branchId: formData.get("branchId"),
    movieId: formData.get("movieId"),
    status: formData.get("status"),
    language: formData.get("language"),
  });
  if (!batchParsed.success) return { error: batchParsed.error.issues[0]?.message ?? "Please check the form." };

  const accessError = await assertBranchAccess(session.sub, session.role, batchParsed.data.branchId);
  if (accessError) return { error: accessError };

  const auditoriumIds = formData.getAll("row_auditoriumId").map(String);
  const priceCardIds = formData.getAll("row_priceCardId").map(String);
  const formats = formData.getAll("row_format").map(String);
  const trailerDurations = formData.getAll("row_trailerDurationMins").map(String);
  const startTimes = formData.getAll("row_startTime").map(String);
  const endTimes = formData.getAll("row_endTime").map(String);
  const cleanupTimes = formData.getAll("row_cleanupTimeMins").map(String);
  const rowKeys = formData.getAll("row_key").map(String);

  if (auditoriumIds.length === 0) return { error: "Add at least one session." };

  const rows: {
    auditoriumId: string;
    priceCardId: string | null;
    format: string;
    trailerDurationMins: number;
    startTime: Date;
    endTime: Date | null;
    cleanupTimeMins: number;
    salesOnPos: boolean;
    salesOnWeb: boolean;
  }[] = [];

  for (let i = 0; i < auditoriumIds.length; i++) {
    const parsed = filmSessionRowSchema.safeParse({
      auditoriumId: auditoriumIds[i],
      priceCardId: priceCardIds[i] || "",
      format: formats[i],
      trailerDurationMins: trailerDurations[i] || 0,
      startTime: startTimes[i],
      endTime: endTimes[i] || "",
      cleanupTimeMins: cleanupTimes[i] || 0,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check each session's details." };

    const rowKey = rowKeys[i];
    const salesOnPos = formData.get(`row_salesOnPos_${rowKey}`) === "true";
    const salesOnWeb = formData.get(`row_salesOnWeb_${rowKey}`) === "true";
    if (!salesOnPos && !salesOnWeb) return { error: "Each session must be sold on POS, Web, or both." };

    rows.push({
      auditoriumId: parsed.data.auditoriumId,
      priceCardId: parsed.data.priceCardId || null,
      format: parsed.data.format,
      trailerDurationMins: parsed.data.trailerDurationMins,
      startTime: parseWatDateTimeLocal(parsed.data.startTime),
      endTime: parsed.data.endTime ? parseWatDateTimeLocal(parsed.data.endTime) : null,
      cleanupTimeMins: parsed.data.cleanupTimeMins,
      salesOnPos,
      salesOnWeb,
    });
  }

  const auditoriums = await prisma.auditorium.findMany({ where: { id: { in: rows.map((r) => r.auditoriumId) } } });
  if (auditoriums.some((a) => a.branchId !== batchParsed.data.branchId)) {
    return { error: "Every screen must belong to the selected cinema." };
  }

  const priceCardIdsUsed = rows.map((r) => r.priceCardId).filter((id): id is string => Boolean(id));
  if (priceCardIdsUsed.length > 0) {
    const priceCards = await prisma.priceCard.findMany({ where: { id: { in: priceCardIdsUsed } } });
    if (priceCards.some((p) => p.branchId !== batchParsed.data.branchId)) {
      return { error: "Every price card must belong to the selected cinema." };
    }
  }

  for (const row of rows) {
    const conflict = await prisma.showtime.findFirst({ where: { auditoriumId: row.auditoriumId, startTime: row.startTime } });
    if (conflict) return { error: "One of these screens already has a session scheduled at that time." };
  }

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const basePrice = await resolveBasePrice(row.priceCardId);
      await tx.showtime.create({
        data: {
          movieId: batchParsed.data.movieId,
          auditoriumId: row.auditoriumId,
          priceCardId: row.priceCardId,
          startTime: row.startTime,
          endTime: row.endTime,
          basePrice,
          language: batchParsed.data.language,
          format: row.format,
          status: batchParsed.data.status,
          trailerDurationMins: row.trailerDurationMins,
          cleanupTimeMins: row.cleanupTimeMins,
          salesOnPos: row.salesOnPos,
          salesOnWeb: row.salesOnWeb,
        },
      });
    }
  });

  await ensureFilmContract(batchParsed.data.movieId, batchParsed.data.branchId);

  await logAdminAction(session.sub, "CREATE", "Showtime", "bulk-session-create", {
    movieId: batchParsed.data.movieId,
    count: rows.length,
  });
  revalidatePath("/admin/scheduling");
  return { success: true };
}

export async function deleteSessionAction(id: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) throw new Error(claimError);

  await prisma.showtime.delete({ where: { id } });
  await logAdminAction(session.sub, "DELETE", "Showtime", id);
  revalidatePath("/admin/scheduling");
}

/** Editing is only ever offered in the UI for sessions that haven't started yet — this re-checks that server-side rather than trusting the client's clock. */
export async function updateFilmSessionAction(_prev: SessionFormState, formData: FormData): Promise<SessionFormState> {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) return { error: claimError };

  const id = String(formData.get("id"));
  const existing = await prisma.showtime.findUnique({ where: { id }, include: { auditorium: true } });
  if (!existing) return { error: "Session not found." };
  if (existing.startTime.getTime() <= Date.now()) return { error: "This session has already started and can no longer be edited." };

  const accessError = await assertBranchAccess(session.sub, session.role, existing.auditorium.branchId);
  if (accessError) return { error: accessError };

  const bookingCount = await prisma.booking.count({ where: { showtimeId: id, status: { in: ["PENDING", "CONFIRMED"] } } });
  if (bookingCount > 0) return { error: "This session already has bookings, so it can no longer be edited — cancel/refund them first if it must change." };

  const movieId = String(formData.get("movieId") || "");
  const language = String(formData.get("language") || "");
  const status = formData.get("status") === "CLOSED" ? "CLOSED" : "OPEN";
  if (!movieId) return { error: "Select a film." };

  const parsed = filmSessionRowSchema.safeParse({
    auditoriumId: formData.get("auditoriumId"),
    priceCardId: formData.get("priceCardId") || "",
    format: formData.get("format"),
    trailerDurationMins: formData.get("trailerDurationMins") || 0,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime") || "",
    cleanupTimeMins: formData.get("cleanupTimeMins") || 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const salesOnPos = formData.get("salesOnPos") === "true";
  const salesOnWeb = formData.get("salesOnWeb") === "true";
  if (!salesOnPos && !salesOnWeb) return { error: "This session must be sold on POS, Web, or both." };

  const auditorium = await prisma.auditorium.findUnique({ where: { id: parsed.data.auditoriumId } });
  if (!auditorium || auditorium.branchId !== existing.auditorium.branchId) return { error: "Choose a screen at this cinema." };

  if (parsed.data.priceCardId) {
    const priceCard = await prisma.priceCard.findUnique({ where: { id: parsed.data.priceCardId } });
    if (!priceCard || priceCard.branchId !== existing.auditorium.branchId) return { error: "This price card doesn't belong to this cinema." };
  }

  const newStart = parseWatDateTimeLocal(parsed.data.startTime);
  if (newStart.getTime() <= Date.now()) return { error: "Choose a start time in the future." };

  const conflict = await prisma.showtime.findFirst({
    where: { auditoriumId: parsed.data.auditoriumId, startTime: newStart, id: { not: id } },
  });
  if (conflict) return { error: "This screen already has a session scheduled at that time." };

  const basePrice = await resolveBasePrice(parsed.data.priceCardId || null);

  await prisma.showtime.update({
    where: { id },
    data: {
      movieId,
      auditoriumId: parsed.data.auditoriumId,
      priceCardId: parsed.data.priceCardId || null,
      startTime: newStart,
      endTime: parsed.data.endTime ? parseWatDateTimeLocal(parsed.data.endTime) : null,
      basePrice,
      language,
      format: parsed.data.format,
      status,
      trailerDurationMins: parsed.data.trailerDurationMins,
      cleanupTimeMins: parsed.data.cleanupTimeMins,
      salesOnPos,
      salesOnWeb,
    },
  });

  await ensureFilmContract(movieId, existing.auditorium.branchId);

  await logAdminAction(session.sub, "UPDATE", "Showtime", id);
  revalidatePath("/admin/scheduling");
  return { success: true };
}

export async function deleteDaySessionsAction(auditoriumIds: string[], dayStart: string, dayEnd: string) {
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) throw new Error(claimError);

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
  const session = await requireRole(["SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) throw new Error(claimError);

  const fromStart = new Date(fromDayStart);
  const fromEnd = new Date(fromStart.getTime() + 24 * 60 * 60 * 1000);
  const toStart = new Date(toDayStart);
  const dayOffsetMs = toStart.getTime() - fromStart.getTime();

  const sourceSessions = await prisma.showtime.findMany({
    where: { auditoriumId: { in: auditoriumIds }, startTime: { gte: fromStart, lt: fromEnd } },
    include: { auditorium: true },
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
        salesOnPos: s.salesOnPos,
        salesOnWeb: s.salesOnWeb,
      },
    });
    await ensureFilmContract(s.movieId, s.auditorium.branchId);
    created++;
  }

  await logAdminAction(session.sub, "CREATE", "Showtime", "bulk-duplicate", { created, from: fromDayStart, to: toDayStart });
  revalidatePath("/admin/scheduling");
  return created;
}

/**
 * Copies a day's sessions from one cinema to another cinema entirely — rooms and price
 * cards are matched by name across the two branches (there's no other correlation between
 * per-branch Auditorium/PriceCard rows), and anything without a same-named match is skipped
 * rather than guessed at. CircuitAdmin only, since it reaches into two branches at once.
 */
export async function duplicateAcrossCircuitAction(
  fromBranchId: string,
  toBranchId: string,
  fromDayStart: string,
  toDayStart: string
): Promise<{ created: number; skipped: number }> {
  const session = await requireRole(["CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_UPDATE_SHOWTIMES");
  if (claimError) throw new Error(claimError);
  if (fromBranchId === toBranchId) throw new Error("Choose two different cinemas.");

  const [fromAuditoriums, toAuditoriums, toPriceCards] = await Promise.all([
    prisma.auditorium.findMany({ where: { branchId: fromBranchId } }),
    prisma.auditorium.findMany({ where: { branchId: toBranchId } }),
    prisma.priceCard.findMany({ where: { branchId: toBranchId } }),
  ]);

  const targetAuditoriumByName = new Map(toAuditoriums.map((a) => [a.name.trim().toLowerCase(), a]));
  const targetPriceCardByName = new Map(toPriceCards.map((p) => [p.name.trim().toLowerCase(), p]));

  const fromStart = new Date(fromDayStart);
  const fromEnd = new Date(fromStart.getTime() + 24 * 60 * 60 * 1000);
  const toStart = new Date(toDayStart);
  const dayOffsetMs = toStart.getTime() - fromStart.getTime();

  const sourceSessions = await prisma.showtime.findMany({
    where: { auditoriumId: { in: fromAuditoriums.map((a) => a.id) }, startTime: { gte: fromStart, lt: fromEnd } },
    include: { auditorium: true, priceCard: true },
  });

  let created = 0;
  let skipped = 0;

  for (const s of sourceSessions) {
    const targetAuditorium = targetAuditoriumByName.get(s.auditorium.name.trim().toLowerCase());
    if (!targetAuditorium) {
      skipped++;
      continue;
    }

    const newStart = new Date(s.startTime.getTime() + dayOffsetMs);
    const newEnd = s.endTime ? new Date(s.endTime.getTime() + dayOffsetMs) : null;

    const conflict = await prisma.showtime.findFirst({ where: { auditoriumId: targetAuditorium.id, startTime: newStart } });
    if (conflict) {
      skipped++;
      continue;
    }

    const targetPriceCard = s.priceCard ? targetPriceCardByName.get(s.priceCard.name.trim().toLowerCase()) : undefined;
    const basePrice = targetPriceCard ? await resolveBasePrice(targetPriceCard.id) : s.basePrice;

    await prisma.showtime.create({
      data: {
        movieId: s.movieId,
        auditoriumId: targetAuditorium.id,
        priceCardId: targetPriceCard?.id ?? null,
        startTime: newStart,
        endTime: newEnd,
        basePrice,
        language: s.language,
        format: s.format,
        status: s.status,
        trailerDurationMins: s.trailerDurationMins,
        cleanupTimeMins: s.cleanupTimeMins,
        salesOnPos: s.salesOnPos,
        salesOnWeb: s.salesOnWeb,
      },
    });
    await ensureFilmContract(s.movieId, toBranchId);
    created++;
  }

  await logAdminAction(session.sub, "CREATE", "Showtime", "bulk-duplicate-across-circuit", {
    created,
    skipped,
    fromBranchId,
    toBranchId,
    from: fromDayStart,
    to: toDayStart,
  });
  revalidatePath("/admin/scheduling");
  return { created, skipped };
}
