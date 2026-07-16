"use client";

import { useActionState, useState } from "react";
import { SeatMap, type SeatMapSeat } from "@/components/seat-map";
import { createManualBookingAction, type FormState } from "@/actions/admin/bookings";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import { seatPrice } from "@/lib/booking-client";

type ShowtimeOption = { id: string; label: string };

export function ManualBookingClient({ showtimes }: { showtimes: ShowtimeOption[] }) {
  const [showtimeId, setShowtimeId] = useState("");
  const [seatData, setSeatData] = useState<{ seats: SeatMapSeat[]; rows: string[]; seatsPerRow: number; basePrice: number } | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createManualBookingAction, null);

  function handleShowtimeChange(id: string) {
    setShowtimeId(id);
    setSelected(new Set());

    if (!id) {
      setSeatData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/seats/${id}`)
      .then((res) => res.json())
      .then((data) => setSeatData(data))
      .finally(() => setLoading(false));
  }

  function toggle(seat: SeatMapSeat) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  const seatById = new Map(seatData?.seats.map((s) => [s.id, s]) ?? []);
  const total = Array.from(selected).reduce((sum, id) => {
    const seat = seatById.get(id);
    return sum + (seat && seatData ? seatPrice(seatData.basePrice, seat.category) : 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="showtimeSelect">Showtime</Label>
        <Select id="showtimeSelect" value={showtimeId} onChange={(e) => handleShowtimeChange(e.target.value)}>
          <option value="">Select a showtime</option>
          {showtimes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      {loading && <p className="text-sm text-muted">Loading seat map...</p>}

      {seatData && (
        <div className="rounded-xl border border-border bg-surface-2 p-5">
          <SeatMap
            seats={seatData.seats}
            rows={seatData.rows}
            seatsPerRow={seatData.seatsPerRow}
            selectedSeatIds={selected}
            onToggle={toggle}
          />
        </div>
      )}

      {selected.size > 0 && (
        <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <input type="hidden" name="showtimeId" value={showtimeId} />
          {Array.from(selected).map((id) => (
            <input key={id} type="hidden" name="seatIds" value={id} />
          ))}

          <div className="flex items-center justify-between font-semibold">
            <span>
              {selected.size} seat{selected.size === 1 ? "" : "s"} selected
            </span>
            <span className="text-brand-light">{formatNaira(total)}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="guestName">Customer name</Label>
              <Input id="guestName" name="guestName" required />
            </div>
            <div>
              <Label htmlFor="guestPhone">Phone</Label>
              <Input id="guestPhone" name="guestPhone" required />
            </div>
            <div>
              <Label htmlFor="guestEmail">Email (optional)</Label>
              <Input id="guestEmail" name="guestEmail" type="email" />
            </div>
          </div>

          {state?.error && <FieldError>{state.error}</FieldError>}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Processing sale..." : "Confirm Box-Office Sale"}
          </Button>
        </form>
      )}
    </div>
  );
}
