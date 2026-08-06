import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getBookingSessionId } from "@/lib/booking-session";
import { getSession } from "@/lib/auth";
import { seatPrice } from "@/lib/booking";
import { CheckoutClient } from "@/components/checkout-client";
import { formatShowtime } from "@/lib/format";

export default async function CheckoutPage({ params }: { params: Promise<{ showtimeId: string }> }) {
  const { showtimeId } = await params;
  const sessionId = await getBookingSessionId();
  const session = await getSession();

  const [showtime, activeLocks] = await Promise.all([
    prisma.showtime.findUnique({ where: { id: showtimeId }, include: { movie: true, auditorium: { include: { branch: true } } } }),
    prisma.seatLock.findMany({
      where: { showtimeId, sessionId, lockedUntil: { gt: new Date() } },
      include: { seat: true },
      orderBy: { seat: { number: "asc" } },
    }),
  ]);

  if (!showtime || showtime.status === "CLOSED" || activeLocks.length === 0) {
    redirect(`/booking/${showtimeId}/seats`);
  }

  // Concessions on offer are whatever this specific cinema has activated in its POS catalog.
  const posItems = await prisma.posItem.findMany({ where: { branchId: showtime.auditorium.branchId } });
  const concessions = posItems.map((p) => ({ id: p.id, name: p.name, description: p.description, price: p.defaultPrice }));

  const lockedSeats = activeLocks.map((lock) => ({
    id: lock.seat.id,
    row: lock.seat.row,
    number: lock.seat.number,
    category: lock.seat.category,
    price: seatPrice(showtime.basePrice, lock.seat.category),
  }));

  const lockExpiry = activeLocks[0].lockedUntil.toISOString();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted">
          {showtime.movie.title} · {showtime.auditorium.branch.name} · {formatShowtime(showtime.startTime)}
        </p>
      </div>

      <CheckoutClient
        showtimeId={showtimeId}
        sessionId={sessionId}
        seats={lockedSeats}
        concessions={concessions}
        lockExpiry={lockExpiry}
        isLoggedIn={!!session}
      />
    </div>
  );
}
