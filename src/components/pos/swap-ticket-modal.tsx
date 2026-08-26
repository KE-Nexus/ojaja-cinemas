"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Repeat, AlertTriangle } from "lucide-react";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { findBookingAction, posSwapTicketAction, type FoundBooking } from "@/actions/pos/tools";

type ReplacementLine = { ticketClassId: string; label: string; quantity: number };

export function SwapTicketModal({
  replacementLines,
  onSwapComplete,
  onClose,
}: {
  replacementLines: ReplacementLine[];
  onSwapComplete: () => void;
  onClose: () => void;
}) {
  const [reference, setReference] = useState("");
  const [booking, setBooking] = useState<FoundBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const replacementCount = replacementLines.reduce((s, l) => s + l.quantity, 0);

  function lookup() {
    if (!reference.trim()) return;
    setError(null);
    setBooking(null);
    startTransition(async () => {
      try {
        const result = await findBookingAction({ reference: reference.trim() });
        if (result.error) setError(result.error);
        else setBooking(result.booking ?? null);
      } catch {
        setError("You're offline — this needs a connection.");
      }
    });
  }

  function swap() {
    if (!booking) return;
    if (replacementLines.length === 0) {
      setError("Ensure you have added the replacement ticket to cart.");
      return;
    }
    const replacementTicketClassIds = replacementLines.flatMap((l) => Array(l.quantity).fill(l.ticketClassId));
    startTransition(async () => {
      try {
        const result = await posSwapTicketAction(booking.reference, replacementTicketClassIds);
        if (result.error) {
          setError(result.error);
          return;
        }
        toast.success(`Seats swapped for ${booking.reference}.`);
        onSwapComplete();
        onClose();
      } catch {
        setError("You're offline — this needs a connection.");
      }
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

      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-sm text-danger">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </p>
      )}

      {booking && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-semibold">{booking.reference}</p>
          <p className="text-sm text-muted">{booking.movie}</p>
          <p className="text-sm text-muted">
            {booking.branch} · {new Date(booking.startTime).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="mt-2 text-sm">Current seats: {booking.seats.map((s) => `${s.row}${s.number}`).join(", ") || "None"}</p>

          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Replacement ticket(s) in cart</p>
            {replacementLines.length === 0 ? (
              <p className="mt-1 text-sm text-muted">None yet — add tickets from the Tickets tab first.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {replacementLines.map((l) => (
                  <li key={l.ticketClassId}>
                    {l.quantity}× {l.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={swap}
            disabled={isPending || booking.status !== "CONFIRMED"}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-accent-cyan py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Repeat size={15} /> {isPending ? "Swapping..." : `Swap to New Ticket${replacementCount === 1 ? "" : "s"}`}
          </button>
          {booking.status !== "CONFIRMED" && <p className="mt-1.5 text-xs text-muted">Only confirmed bookings can be swapped.</p>}
        </div>
      )}
    </PosModalShell>
  );
}
