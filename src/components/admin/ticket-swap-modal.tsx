"use client";

import { useState, useTransition } from "react";
import { Repeat, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { SeatMap, type SeatMapSeat } from "@/components/seat-map";
import { swapBookingSeatsAction } from "@/actions/admin/bookings";

export function TicketSwapModal({
  bookingId,
  seats,
  rows,
  seatsPerRow,
  currentSeatIds,
  seatLimit,
}: {
  bookingId: string;
  seats: SeatMapSeat[];
  rows: string[];
  seatsPerRow: number;
  currentSeatIds: string[];
  seatLimit: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentSeatIds));
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function toggle(seat: SeatMapSeat) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (next.size < seatLimit) next.add(seat.id);
      else return prev;
      return next;
    });
  }

  function submit() {
    setError(undefined);
    const formData = new FormData();
    formData.set("bookingId", bookingId);
    for (const id of selected) formData.append("seatIds", id);

    startTransition(async () => {
      const result = await swapBookingSeatsAction(null, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        toast.success("Seats swapped.");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Repeat size={14} /> Swap Seats
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Swap Seats</h2>
            <p className="text-xs text-muted">Select {seatLimit} seat{seatLimit === 1 ? "" : "s"} for this showtime.</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <SeatMap seats={seats} rows={rows} seatsPerRow={seatsPerRow} selectedSeatIds={selected} onToggle={toggle} />

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted">
            {selected.size} / {seatLimit} selected
          </p>
          <div className="flex items-center gap-3">
            {error && <FieldError>{error}</FieldError>}
            <Button type="button" size="sm" onClick={submit} disabled={isPending || selected.size !== seatLimit}>
              {isPending ? "Swapping..." : "Confirm Swap"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
