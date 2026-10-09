"use client";

import { useState, useTransition } from "react";
import { Search, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { findBookingAction, processBookingCardPaymentAction, type FoundBooking } from "@/actions/pos/tools";
import { formatNaira, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Mode = "reference" | "phone" | "email";

export function FindBookingModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("reference");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<FoundBooking | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPaying, startPayment] = useTransition();

  function search() {
    if (!query.trim()) return;
    setError(null);
    setBooking(null);
    startTransition(async () => {
      try {
        const result = await findBookingAction({ [mode]: query.trim() });
        if (result.error) setError(result.error);
        else setBooking(result.booking ?? null);
      } catch {
        setError("You're offline — this needs a connection.");
      }
    });
  }

  function pay() {
    if (!booking) return;
    startPayment(async () => {
      const result = await processBookingCardPaymentAction(booking.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Payment processed — ${booking.reference} marked as paid by card.`);
      setBooking({ ...booking, status: "CONFIRMED" });
    });
  }

  return (
    <PosModalShell title="Find Booking" onClose={onClose}>
      <div className="mb-3 flex gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1">
        {(["reference", "phone", "email"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-colors",
              mode === m ? "bg-brand text-white" : "text-muted hover:text-white"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={mode === "reference" ? "e.g. OJJ-AB12CD" : mode === "phone" ? "Guest phone number" : "Guest email"}
          autoFocus
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
        />
        <button
          onClick={search}
          disabled={isPending || !query.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
        >
          <Search size={14} /> {isPending ? "..." : "Search"}
        </button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {booking && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">{booking.reference}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                booking.status === "CONFIRMED" ? "bg-success/20 text-success" : "bg-white/10 text-muted"
              )}
            >
              {booking.status}
            </span>
          </div>
          <p className="text-sm text-muted">{booking.movie}</p>
          <p className="text-sm text-muted">
            {booking.branch} · {formatDateTime(booking.startTime)}
          </p>
          {booking.guestName && <p className="mt-1 text-sm text-muted">Guest: {booking.guestName}</p>}
          <p className="mt-2 text-sm">
            Seats: {booking.seats.map((s) => `${s.row}${s.number}`).join(", ") || "None"}
          </p>
          {booking.concessions.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="text-muted">Concessions:</p>
              <ul className="ml-3 list-disc">
                {booking.concessions.map((c, i) => (
                  <li key={i}>
                    {c.quantity}x {c.name} — {formatNaira(c.price * c.quantity)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-lg font-bold text-brand-light">{formatNaira(booking.total)}</p>

          {booking.status === "PENDING" && (
            <button
              onClick={pay}
              disabled={isPaying}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-accent-cyan py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CreditCard size={15} /> {isPaying ? "Processing..." : "Process Card Payment"}
            </button>
          )}
        </div>
      )}
    </PosModalShell>
  );
}
