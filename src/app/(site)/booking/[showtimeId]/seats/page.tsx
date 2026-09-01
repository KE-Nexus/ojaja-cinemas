import { notFound } from "next/navigation";
import Image from "next/image";
import { getShowtimeWithSeatMap } from "@/lib/booking";
import { getBookingSessionId } from "@/lib/booking-session";
import { SeatSelectionClient } from "@/components/seat-selection-client";
import { formatShowtime } from "@/lib/format";

export default async function SeatSelectionPage({ params }: { params: Promise<{ showtimeId: string }> }) {
  const { showtimeId } = await params;
  const sessionId = await getBookingSessionId();

  const data = await getShowtimeWithSeatMap(showtimeId, sessionId);
  if (!data) notFound();

  const { showtime, seats, rows, seatsPerRow } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md">
          <Image src={showtime.movie.posterUrl} alt={showtime.movie.title} fill unoptimized referrerPolicy="no-referrer" className="object-cover" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide">{showtime.movie.title}</h1>
          <p className="text-sm text-muted">
            {showtime.auditorium.branch.name} · {showtime.auditorium.name} ({showtime.format}) · {formatShowtime(showtime.startTime)}
          </p>
        </div>
      </div>

      <SeatSelectionClient
        showtimeId={showtimeId}
        sessionId={sessionId}
        seats={seats}
        rows={rows}
        seatsPerRow={seatsPerRow}
        basePrice={showtime.basePrice}
      />
    </div>
  );
}
