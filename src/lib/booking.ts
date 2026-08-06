import "server-only";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import type { SeatMapSeat, SeatStatus } from "@/components/seat-map";

export { CATEGORY_MULTIPLIER, seatPrice } from "@/lib/booking-client";

export const SEAT_LOCK_MINUTES = 10;

export function generateBookingReference(): string {
  return `OJ-${nanoid(8).toUpperCase()}`;
}

export async function getShowtimeWithSeatMap(showtimeId: string, sessionId?: string) {
  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      movie: true,
      auditorium: { include: { branch: true, seats: true } },
    },
  });
  if (!showtime || showtime.status === "CLOSED") return null;

  const now = new Date();

  const [bookedSeatRows, activeLocks] = await Promise.all([
    prisma.bookingSeat.findMany({
      where: {
        booking: { showtimeId, status: { in: ["PENDING", "CONFIRMED"] } },
      },
      select: { seatId: true },
    }),
    prisma.seatLock.findMany({
      where: { showtimeId, lockedUntil: { gt: now } },
    }),
  ]);

  const bookedSeatIds = new Set(bookedSeatRows.map((r) => r.seatId));
  const lockBySeatId = new Map(activeLocks.map((l) => [l.seatId, l]));

  const seats: SeatMapSeat[] = showtime.auditorium.seats.map((seat) => {
    let status: SeatStatus = "AVAILABLE";
    if (bookedSeatIds.has(seat.id)) {
      status = "BOOKED";
    } else {
      const lock = lockBySeatId.get(seat.id);
      if (lock) {
        status = lock.sessionId === sessionId ? "SELECTED" : "LOCKED";
      }
    }
    return { id: seat.id, row: seat.row, number: seat.number, category: seat.category, status };
  });

  const rows = Array.from(new Set(showtime.auditorium.seats.map((s) => s.row))).sort();

  return { showtime, seats, rows, seatsPerRow: showtime.auditorium.seatsPerRow };
}

export class SeatUnavailableError extends Error {}

export async function lockSeats(showtimeId: string, seatIds: string[], sessionId: string): Promise<Date> {
  const lockedUntil = new Date(Date.now() + SEAT_LOCK_MINUTES * 60 * 1000);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const bookedSeatRows = await tx.bookingSeat.findMany({
      where: { seatId: { in: seatIds }, booking: { showtimeId, status: { in: ["PENDING", "CONFIRMED"] } } },
      select: { seatId: true },
    });
    if (bookedSeatRows.length > 0) {
      throw new SeatUnavailableError("One or more selected seats have already been booked.");
    }

    const conflictingLocks = await tx.seatLock.findMany({
      where: {
        seatId: { in: seatIds },
        showtimeId,
        lockedUntil: { gt: now },
        NOT: { sessionId },
      },
    });
    if (conflictingLocks.length > 0) {
      throw new SeatUnavailableError("One or more selected seats were just taken by another customer.");
    }

    for (const seatId of seatIds) {
      await tx.seatLock.upsert({
        where: { seatId_showtimeId: { seatId, showtimeId } },
        update: { lockedUntil, sessionId },
        create: { seatId, showtimeId, sessionId, lockedUntil },
      });
    }
  });

  return lockedUntil;
}

export async function releaseSeatLocks(showtimeId: string, sessionId: string): Promise<void> {
  await prisma.seatLock.deleteMany({ where: { showtimeId, sessionId } });
}

export async function getActiveLockExpiry(showtimeId: string, sessionId: string): Promise<Date | null> {
  const lock = await prisma.seatLock.findFirst({
    where: { showtimeId, sessionId, lockedUntil: { gt: new Date() } },
    orderBy: { lockedUntil: "desc" },
  });
  return lock?.lockedUntil ?? null;
}

export async function applyPromoCode(code: string, subtotal: number) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.isActive) return { discount: 0, promoCode: null, error: "Invalid promo code." };
  if (promo.expiresAt && promo.expiresAt < new Date()) return { discount: 0, promoCode: null, error: "This promo code has expired." };
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit)
    return { discount: 0, promoCode: null, error: "This promo code has reached its usage limit." };

  const discount = promo.discountType === "PERCENT" ? Math.round((subtotal * promo.discountValue) / 100) : Math.min(promo.discountValue, subtotal);

  return { discount, promoCode: promo, error: null };
}
