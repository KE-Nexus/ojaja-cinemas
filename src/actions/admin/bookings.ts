"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { seatPrice, generateBookingReference } from "@/lib/booking";
import { notificationProvider } from "@/lib/providers/notification";
import { notifySeatClassSubscribers } from "@/lib/seat-class-notify";
import { formatNaira, formatShowtime } from "@/lib/format";
import { assertHasClaim } from "@/lib/claims";

export type FormState = { error?: string } | null;

export async function createManualBookingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);

  const showtimeId = String(formData.get("showtimeId") ?? "");
  const seatIds = formData.getAll("seatIds").map(String);
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestEmail = String(formData.get("guestEmail") ?? "").trim();
  const guestPhone = String(formData.get("guestPhone") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "CASH");

  if (!showtimeId) return { error: "Select a showtime." };
  if (seatIds.length === 0) return { error: "Select at least one seat." };
  if (!guestName || !guestPhone) return { error: "Customer name and phone are required." };
  if (!["CARD", "CASH", "TRANSFER", "VOUCHER"].includes(paymentMethod)) return { error: "Select a valid payment method." };

  const showtime = await prisma.showtime.findUnique({ where: { id: showtimeId }, include: { movie: true, auditorium: true } });
  if (!showtime) return { error: "Showtime not found." };

  const seats = await prisma.seat.findMany({ where: { id: { in: seatIds } } });
  if (seats.length !== seatIds.length) return { error: "One or more seats could not be found." };

  const alreadyBooked = await prisma.bookingSeat.findFirst({
    where: { seatId: { in: seatIds }, booking: { showtimeId, status: { in: ["PENDING", "CONFIRMED"] } } },
  });
  if (alreadyBooked) return { error: "One or more selected seats are already booked." };

  const totalAmount = seats.reduce((sum, seat) => sum + seatPrice(showtime.basePrice, seat.category), 0);
  const reference = generateBookingReference();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        reference,
        guestName,
        guestEmail: guestEmail || undefined,
        guestPhone,
        showtimeId,
        processedById: session.sub,
        status: "CONFIRMED",
        subtotal: totalAmount,
        totalAmount,
      },
    });

    for (const seat of seats) {
      await tx.bookingSeat.create({
        data: { bookingId: booking.id, seatId: seat.id, priceAtBooking: seatPrice(showtime.basePrice, seat.category) },
      });
    }

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: "box-office",
        method: paymentMethod,
        status: "SUCCESS",
        amount: totalAmount,
        reference: `COUNTER-${reference}`,
      },
    });

    await tx.seatLock.deleteMany({ where: { showtimeId, seatId: { in: seatIds } } });
  });

  await logAdminAction(session.sub, "CREATE", "Booking", reference, { channel: "box-office", amount: totalAmount });

  if (guestEmail) {
    await notificationProvider.sendEmail(
      guestEmail,
      `Your OJAJA Cinemas booking is confirmed (${reference})`,
      `Hi ${guestName}, your box-office booking for ${showtime.movie.title} at ${formatShowtime(showtime.startTime)} is confirmed. Total paid: ${formatNaira(totalAmount)}.`
    );
  }

  await notifySeatClassSubscribers({
    branchId: showtime.auditorium.branchId,
    categories: seats.map((s) => s.category),
    bookingReference: reference,
    movieTitle: showtime.movie.title,
    showtimeStart: showtime.startTime,
  });

  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings/${reference}`);
}

export async function refundBookingAction(bookingId: string) {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED") return;

  // A box-office sale (processedById set) refund needs "Can Refund On POS";
  // a customer's own online order needs the broader "Can Refund Orders".
  const claimError = await assertHasClaim(session.role, booking.processedById ? "CAN_REFUND_ON_POS" : "CAN_REFUND_ORDERS");
  if (claimError) throw new Error(claimError);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "REFUNDED" } });
    await tx.payment.updateMany({ where: { bookingId, status: "SUCCESS" }, data: { status: "REFUNDED" } });
  });

  await logAdminAction(session.sub, "REFUND", "Booking", booking.reference, { amount: booking.totalAmount });
  revalidatePath(`/admin/bookings/${booking.reference}`);
  revalidatePath("/admin/bookings");
}

export type SwapFormState = { error?: string; success?: boolean } | null;

// Ticket Swap (per confirmed scope): seats only, same showtime — no showtime/date change.
export async function swapBookingSeatsAction(_prev: SwapFormState, formData: FormData): Promise<SwapFormState> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_SWAP_TICKETS");
  if (claimError) return { error: claimError };

  const bookingId = String(formData.get("bookingId") ?? "");
  const newSeatIds = formData.getAll("seatIds").map(String);
  if (!bookingId) return { error: "Booking not found." };
  if (newSeatIds.length === 0) return { error: "Select at least one seat." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { seats: true, showtime: { include: { auditorium: true } } },
  });
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "CONFIRMED") return { error: "Only confirmed bookings can have seats swapped." };
  if (newSeatIds.length !== booking.seats.length) return { error: `Select exactly ${booking.seats.length} seat(s) to match the original booking.` };

  const currentSeatIds = new Set(booking.seats.map((s) => s.seatId));
  const trulyNew = newSeatIds.filter((id) => !currentSeatIds.has(id));

  if (trulyNew.length === 0) return { error: "Select different seats to swap into." };

  const newSeats = await prisma.seat.findMany({ where: { id: { in: newSeatIds } } });
  if (newSeats.length !== newSeatIds.length) return { error: "One or more selected seats could not be found." };
  if (newSeats.some((s) => s.auditoriumId !== booking.showtime.auditoriumId)) {
    return { error: "Seats must be in the same auditorium as the original showtime." };
  }

  const conflict = await prisma.bookingSeat.findFirst({
    where: {
      seatId: { in: trulyNew },
      booking: { showtimeId: booking.showtimeId, status: { in: ["PENDING", "CONFIRMED"] }, id: { not: bookingId } },
    },
  });
  if (conflict) return { error: "One or more selected seats are already booked for this showtime." };

  const newSubtotal = newSeats.reduce((sum, seat) => sum + seatPrice(booking.showtime.basePrice, seat.category), 0);

  await prisma.$transaction(async (tx) => {
    await tx.bookingSeat.deleteMany({ where: { bookingId } });
    for (const seat of newSeats) {
      await tx.bookingSeat.create({
        data: { bookingId, seatId: seat.id, priceAtBooking: seatPrice(booking.showtime.basePrice, seat.category) },
      });
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: { subtotal: newSubtotal, totalAmount: newSubtotal - booking.discount },
    });
    await tx.seatLock.deleteMany({ where: { showtimeId: booking.showtimeId, seatId: { in: newSeatIds } } });
  });

  await logAdminAction(session.sub, "UPDATE", "Booking", booking.reference, {
    action: "seat-swap",
    from: booking.seats.map((s) => s.seatId),
    to: newSeatIds,
  });

  revalidatePath(`/admin/bookings/${booking.reference}`);
  revalidatePath("/admin/bookings");
  return { success: true };
}
