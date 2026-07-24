"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { seatPrice, generateBookingReference } from "@/lib/booking";
import { notificationProvider } from "@/lib/providers/notification";
import { formatNaira, formatShowtime } from "@/lib/format";

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

  const showtime = await prisma.showtime.findUnique({ where: { id: showtimeId }, include: { movie: true } });
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

  revalidatePath("/admin/bookings");
  redirect(`/admin/bookings/${reference}`);
}

export async function refundBookingAction(bookingId: string) {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "CONFIRMED") return;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "REFUNDED" } });
    await tx.payment.updateMany({ where: { bookingId, status: "SUCCESS" }, data: { status: "REFUNDED" } });
  });

  await logAdminAction(session.sub, "REFUND", "Booking", booking.reference, { amount: booking.totalAmount });
  revalidatePath(`/admin/bookings/${booking.reference}`);
  revalidatePath("/admin/bookings");
}
