import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { Badge } from "@/components/ui/badge";
import { RefundButton } from "@/components/admin/refund-button";
import { TicketSwapModal } from "@/components/admin/ticket-swap-modal";
import { formatNaira, formatShowtime } from "@/lib/format";
import type { SeatMapSeat } from "@/components/seat-map";

const STATUS_TONE = {
  CONFIRMED: "success",
  PENDING: "gold",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
} as const;

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, auditorium: { include: { branch: true, seats: true } } } },
      seats: { include: { seat: true } },
      concessions: { include: { posItem: true } },
      payments: true,
      user: true,
    },
  });
  if (!booking) notFound();

  const session = await getSession();
  const canSwapTickets = session ? await hasClaim(session.role, "CAN_SWAP_TICKETS") : false;

  let swapProps: { seats: SeatMapSeat[]; rows: string[]; seatsPerRow: number; currentSeatIds: string[] } | null = null;
  if (canSwapTickets && booking.status === "CONFIRMED") {
    const otherBookedSeatIds = new Set(
      (
        await prisma.bookingSeat.findMany({
          where: { booking: { showtimeId: booking.showtimeId, status: { in: ["PENDING", "CONFIRMED"] }, id: { not: booking.id } } },
          select: { seatId: true },
        })
      ).map((s) => s.seatId)
    );
    const seats: SeatMapSeat[] = booking.showtime.auditorium.seats.map((seat) => ({
      id: seat.id,
      row: seat.row,
      number: seat.number,
      category: seat.category,
      status: otherBookedSeatIds.has(seat.id) ? "BOOKED" : "AVAILABLE",
    }));
    swapProps = {
      seats,
      rows: Array.from(new Set(booking.showtime.auditorium.seats.map((s) => s.row))).sort(),
      seatsPerRow: booking.showtime.auditorium.seatsPerRow,
      currentSeatIds: booking.seats.map((s) => s.seatId),
    };
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Booking {booking.reference}</h1>
          <p className="text-sm text-muted">{booking.showtime.movie.title}</p>
        </div>
        <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Details</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Customer</dt>
              <dd>{booking.guestName ?? booking.user?.name}</dd>
            </div>
            <div>
              <dt className="text-muted">Contact</dt>
              <dd>{booking.guestEmail ?? booking.user?.email ?? booking.guestPhone}</dd>
            </div>
            <div>
              <dt className="text-muted">Cinema</dt>
              <dd>
                {booking.showtime.auditorium.branch.name} · {booking.showtime.auditorium.name}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Showtime</dt>
              <dd>{formatShowtime(booking.showtime.startTime)}</dd>
            </div>
            <div>
              <dt className="text-muted">Seats</dt>
              <dd className="flex items-center gap-2">
                {booking.seats.map((s) => `${s.seat.row}${s.seat.number}`).join(", ")}
                {swapProps && (
                  <TicketSwapModal
                    bookingId={booking.id}
                    seats={swapProps.seats}
                    rows={swapProps.rows}
                    seatsPerRow={swapProps.seatsPerRow}
                    currentSeatIds={swapProps.currentSeatIds}
                    seatLimit={swapProps.currentSeatIds.length}
                  />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold text-brand-light">{formatNaira(booking.totalAmount)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Payments</h2>
          <ul className="space-y-2 text-sm">
            {booking.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span>
                  {p.provider} ({p.method}) · {p.reference}
                </span>
                <Badge tone={p.status === "SUCCESS" ? "success" : p.status === "REFUNDED" ? "neutral" : "danger"}>{p.status}</Badge>
              </li>
            ))}
            {booking.payments.length === 0 && <li className="text-muted">No payment records.</li>}
          </ul>
        </div>

        {booking.status === "CONFIRMED" && (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
            <h2 className="mb-2 font-semibold">Refund</h2>
            <p className="mb-3 text-sm text-muted">This will mark the booking as refunded and log the action for audit purposes.</p>
            <RefundButton bookingId={booking.id} />
          </div>
        )}
      </div>
    </div>
  );
}
