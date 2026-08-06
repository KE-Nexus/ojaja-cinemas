"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Repeat } from "lucide-react";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { findBookingAction, posSwapTicketAction, type FoundBooking } from "@/actions/pos/tools";

export function SwapTicketModal({ onClose }: { onClose: () => void }) {
  const [reference, setReference] = useState("");
  const [booking, setBooking] = useState<FoundBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lookup() {
    if (!reference.trim()) return;
    setError(null);
    setBooking(null);
    startTransition(async () => {
      const result = await findBookingAction({ reference: reference.trim() });
      if (result.error) setError(result.error);
      else setBooking(result.booking ?? null);
    });
  }

  function swap() {
    if (!booking) return;
    startTransition(async () => {
      const result = await posSwapTicketAction(booking.reference);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(`Seats swapped for ${booking.reference}.`);
      onClose();
    });
  }

  return (
    <PosModalShell title="Swap Ticket" onClose={onClose}>
      <div className="mb-4 flex gap-2">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="Booking reference e.g. OJJ-AB12CD"
          autoFocus
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
        />
        <button
          onClick={lookup}
          disabled={isPending || !reference.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
        >
          <Search size={14} /> Find
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {booking && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-semibold">{booking.reference}</p>
          <p className="text-sm text-muted">{booking.movie}</p>
          <p className="text-sm text-muted">
            {booking.branch} · {new Date(booking.startTime).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="mt-2 text-sm">Current seats: {booking.seats.map((s) => `${s.row}${s.number}`).join(", ") || "None"}</p>
          <button
            onClick={swap}
            disabled={isPending || booking.status !== "CONFIRMED"}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-accent-cyan py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Repeat size={15} /> {isPending ? "Swapping..." : "Swap to New Seats"}
          </button>
          {booking.status !== "CONFIRMED" && <p className="mt-1.5 text-xs text-muted">Only confirmed bookings can be swapped.</p>}
        </div>
      )}
    </PosModalShell>
  );
}
