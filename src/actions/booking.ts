"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  SeatUnavailableError,
  applyPromoCode,
  generateBookingReference,
  lockSeats,
  releaseSeatLocks,
  seatPrice,
} from "@/lib/booking";
import { paymentProvider } from "@/lib/providers/payment";
import { notificationProvider } from "@/lib/providers/notification";
import { notifySeatClassSubscribers } from "@/lib/seat-class-notify";
import { checkoutSchema, lockSeatsSchema } from "@/lib/validation";
import { formatNaira, formatShowtime } from "@/lib/format";

export type FormState = { error?: string } | null;
export type SeatLockFormState = { error?: string; conflict?: boolean } | null;

export async function lockSeatsAction(_prev: SeatLockFormState, formData: FormData): Promise<SeatLockFormState> {
  const showtimeId = String(formData.get("showtimeId"));
  const sessionId = String(formData.get("sessionId"));
  const seatIds = formData.getAll("seatIds").map(String);

  const parsed = lockSeatsSchema.safeParse({ showtimeId, sessionId, seatIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Select at least one seat." };

  try {
    await lockSeats(parsed.data.showtimeId, parsed.data.seatIds, parsed.data.sessionId);
  } catch (e) {
    if (e instanceof SeatUnavailableError) return { error: e.message, conflict: true };
    throw e;
  }

  redirect(`/booking/${showtimeId}/checkout`);
}

export async function releaseAndReturnAction(showtimeId: string, sessionId: string) {
  await releaseSeatLocks(showtimeId, sessionId);
  redirect(`/booking/${showtimeId}/seats`);
}

export async function createPendingBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    showtimeId: String(formData.get("showtimeId")),
    sessionId: String(formData.get("sessionId")),
    seatIds: formData.getAll("seatIds").map(String),
    concessions: JSON.parse(String(formData.get("concessions") ?? "[]")),
    promoCode: String(formData.get("promoCode") ?? "").trim() || undefined,
    guestName: String(formData.get("guestName") ?? "").trim() || undefined,
    guestEmail: String(formData.get("guestEmail") ?? "").trim() || undefined,
    guestPhone: String(formData.get("guestPhone") ?? "").trim() || undefined,
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };

  const session = await getSession();
  if (!session && (!parsed.data.guestName || !parsed.data.guestEmail || !parsed.data.guestPhone)) {
    return { error: "Please provide your name, email, and phone number to continue as a guest." };
  }

  const showtime = await prisma.showtime.findUnique({ where: { id: parsed.data.showtimeId } });
  if (!showtime) return { error: "This showtime no longer exists." };
  if (!showtime.salesOnWeb) return { error: "This showtime isn't available for online booking." };

  const activeLocks = await prisma.seatLock.findMany({
    where: {
      showtimeId: parsed.data.showtimeId,
      sessionId: parsed.data.sessionId,
      lockedUntil: { gt: new Date() },
      seatId: { in: parsed.data.seatIds },
    },
    include: { seat: true },
  });

  if (activeLocks.length !== parsed.data.seatIds.length) {
    return { error: "Your seat hold has expired. Please select your seats again." };
  }

  const subtotal = activeLocks.reduce((sum, lock) => sum + seatPrice(showtime.basePrice, lock.seat.category), 0);

  const concessionItems = parsed.data.concessions.length
    ? await prisma.posItem.findMany({ where: { id: { in: parsed.data.concessions.map((c) => c.id) } } })
    : [];
  const concessionTotal = parsed.data.concessions.reduce((sum, c) => {
    const item = concessionItems.find((i) => i.id === c.id);
    return sum + (item ? item.defaultPrice * c.quantity : 0);
  }, 0);

  let discount = 0;
  let promoId: string | null = null;
  if (parsed.data.promoCode) {
    const result = await applyPromoCode(parsed.data.promoCode, subtotal + concessionTotal);
    if (result.error) return { error: result.error };
    discount = result.discount;
    promoId = result.promoCode?.id ?? null;
  }

  const total = Math.max(0, subtotal + concessionTotal - discount);
  const reference = generateBookingReference();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        reference,
        userId: session?.sub,
        guestName: session ? undefined : parsed.data.guestName,
        guestEmail: session ? undefined : parsed.data.guestEmail,
        guestPhone: session ? undefined : parsed.data.guestPhone,
        showtimeId: parsed.data.showtimeId,
        status: "PENDING",
        subtotal: subtotal + concessionTotal,
        discount,
        totalAmount: total,
        promoCodeId: promoId ?? undefined,
      },
    });

    for (const lock of activeLocks) {
      await tx.bookingSeat.create({
        data: { bookingId: booking.id, seatId: lock.seatId, priceAtBooking: seatPrice(showtime.basePrice, lock.seat.category) },
      });
    }

    for (const c of parsed.data.concessions) {
      const item = concessionItems.find((i) => i.id === c.id);
      if (item) {
        await tx.bookingConcession.create({
          data: { bookingId: booking.id, posItemId: item.id, quantity: c.quantity, priceAtBooking: item.defaultPrice },
        });
      }
    }

    if (promoId) {
      await tx.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
    }
  });

  redirect(`/booking/pay/${reference}`);
}

async function getBookingOr404(reference: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: { showtime: { include: { movie: true, auditorium: true } }, seats: { include: { seat: true } } },
  });
  return booking;
}

export async function confirmPaymentAction(reference: string, outcome: "success" | "fail") {
  const booking = await getBookingOr404(reference);
  if (!booking || booking.status !== "PENDING") {
    redirect(`/booking/pay/${reference}`);
  }

  const accountUser = booking.userId ? await prisma.user.findUnique({ where: { id: booking.userId } }) : null;
  const contactEmail = booking.guestEmail ?? accountUser?.email;
  const contactName = booking.guestName ?? accountUser?.name ?? "Guest";
  const contactPhone = booking.guestPhone;

  const result =
    outcome === "success"
      ? await paymentProvider.charge({ amount: booking.totalAmount, method: "card", email: contactEmail ?? "guest@ojaja.cinema" })
      : await paymentProvider.fail({ amount: booking.totalAmount, method: "card", email: contactEmail ?? "guest@ojaja.cinema" });

  await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: paymentProvider.name,
      method: "card",
      status: result.status,
      amount: booking.totalAmount,
      reference: result.reference,
      rawResponse: JSON.stringify(result.raw),
    },
  });

  if (result.status === "SUCCESS") {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED" } });
    await prisma.seatLock.deleteMany({ where: { showtimeId: booking.showtimeId } });

    if (contactEmail) {
      const seatList = booking.seats.map((s) => `${s.seat.row}${s.seat.number}`).join(", ");
      await notificationProvider.sendEmail(
        contactEmail,
        `Your OJAJA Cinemas booking is confirmed (${booking.reference})`,
        `Hi ${contactName}, your booking for ${booking.showtime.movie.title} at ${formatShowtime(
          booking.showtime.startTime
        )} is confirmed. Seat${booking.seats.length === 1 ? "" : "s"}: ${seatList}. Total paid: ${formatNaira(
          booking.totalAmount
        )}. Show your QR e-ticket at the door.`
      );
    }
    if (contactPhone) {
      await notificationProvider.sendSms(
        contactPhone,
        `OJAJA Cinemas: Booking ${booking.reference} confirmed for ${booking.showtime.movie.title}. See you at the movies!`
      );
    }

    await notifySeatClassSubscribers({
      branchId: booking.showtime.auditorium.branchId,
      categories: booking.seats.map((s) => s.seat.category),
      bookingReference: booking.reference,
      movieTitle: booking.showtime.movie.title,
      showtimeStart: booking.showtime.startTime,
    });

    redirect(`/booking/confirmation/${booking.reference}`);
  } else {
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } });
    await prisma.seatLock.deleteMany({ where: { showtimeId: booking.showtimeId } });
    redirect(`/booking/pay/${reference}?failed=1`);
  }
}
