"use client";

import { useActionState, useMemo, useState } from "react";
import { SeatMap, type SeatMapSeat } from "@/components/seat-map";
import { Button } from "@/components/ui/button";
import { lockSeatsAction, type FormState } from "@/actions/booking";
import { formatNaira } from "@/lib/format";
import { seatPrice } from "@/lib/booking-client";

export function SeatSelectionClient({
  showtimeId,
  sessionId,
  seats,
  rows,
  seatsPerRow,
  basePrice,
}: {
  showtimeId: string;
  sessionId: string;
  seats: SeatMapSeat[];
  rows: string[];
  seatsPerRow: number;
  basePrice: number;
}) {
  const initiallySelected = useMemo(
    () => new Set(seats.filter((s) => s.status === "SELECTED").map((s) => s.id)),
    [seats]
  );
  const [selected, setSelected] = useState<Set<string>>(initiallySelected);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(lockSeatsAction, null);

  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  function toggle(seat: SeatMapSeat) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else {
        if (next.size >= 10) return prev;
        next.add(seat.id);
      }
      return next;
    });
  }

  const total = Array.from(selected).reduce((sum, id) => {
    const seat = seatById.get(id);
    return sum + (seat ? seatPrice(basePrice, seat.category) : 0);
  }, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <SeatMap seats={seats} rows={rows} seatsPerRow={seatsPerRow} selectedSeatIds={selected} onToggle={toggle} />
      </div>

      <form action={formAction} className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <input type="hidden" name="showtimeId" value={showtimeId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        {Array.from(selected).map((id) => (
          <input key={id} type="hidden" name="seatIds" value={id} />
        ))}

        <h3 className="font-semibold">Your Selection</h3>

        {selected.size === 0 ? (
          <p className="text-sm text-muted">Tap available seats to select them.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {Array.from(selected).map((id) => {
              const seat = seatById.get(id);
              if (!seat) return null;
              return (
                <li key={id} className="flex items-center justify-between">
                  <span>
                    {seat.row}
                    {seat.number} <span className="text-muted">({seat.category.toLowerCase()})</span>
                  </span>
                  <span>{formatNaira(seatPrice(basePrice, seat.category))}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
          <span>Total</span>
          <span className="text-brand-light">{formatNaira(total)}</span>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}

        <Button type="submit" className="w-full" disabled={selected.size === 0 || isPending}>
          {isPending ? "Holding seats..." : `Continue (${selected.size} seat${selected.size === 1 ? "" : "s"})`}
        </Button>
      </form>
    </div>
  );
}
