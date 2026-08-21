"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Tag, Pencil } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { createPendingBookingAction, type FormState } from "@/actions/booking";
import { formatNaira } from "@/lib/format";
import type { SeatCategory } from "@prisma/client";

type LockedSeat = { id: string; row: string; number: number; category: SeatCategory; price: number };
type Concession = { id: string; name: string; description: string | null; price: number };
type GuestDetails = { name: string; email: string; phone: string };

function GuestDetailsModal({
  initial,
  onContinue,
  onClose,
}: {
  initial: GuestDetails;
  onContinue: (details: GuestDetails) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in your name, email, and phone number.");
      return;
    }
    onContinue({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 font-semibold">Your Details</h3>
        <p className="mb-4 text-sm text-muted">We&rsquo;ll use this to send your e-ticket and booking confirmation.</p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="modalGuestName">Full name</Label>
            <Input id="modalGuestName" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" autoFocus />
          </div>
          <div>
            <Label htmlFor="modalGuestEmail">Email</Label>
            <Input id="modalGuestEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <Label htmlFor="modalGuestPhone">Phone number</Label>
            <Input id="modalGuestPhone" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
          </div>
        </div>

        {error && <FieldError>{error}</FieldError>}

        <Button type="button" className="mt-4 w-full" onClick={submit}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}

export function CheckoutClient({
  showtimeId,
  sessionId,
  seats,
  concessions,
  lockExpiry,
  isLoggedIn,
}: {
  showtimeId: string;
  sessionId: string;
  seats: LockedSeat[];
  concessions: Concession[];
  lockExpiry: string;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ discount?: number; error?: string; checking?: boolean } | null>(null);
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({ name: "", email: "", phone: "" });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const autoSubmitRef = useRef(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPendingBookingAction, null);

  const seatSubtotal = seats.reduce((sum, s) => sum + s.price, 0);
  const concessionSubtotal = useMemo(
    () => concessions.reduce((sum, c) => sum + (quantities[c.id] ?? 0) * c.price, 0),
    [concessions, quantities]
  );
  const subtotal = seatSubtotal + concessionSubtotal;
  const discount = promoStatus?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const hasGuestDetails = Boolean(guestDetails.name && guestDetails.email && guestDetails.phone);

  function setQty(id: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(10, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  async function checkPromo() {
    if (!promoCode.trim()) return;
    setPromoStatus({ checking: true });
    try {
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) setPromoStatus({ error: data.error });
      else setPromoStatus({ discount: data.discount });
    } catch {
      setPromoStatus({ error: "Could not validate promo code." });
    }
  }

  const concessionPayload = concessions
    .map((c) => ({ id: c.id, quantity: quantities[c.id] ?? 0 }))
    .filter((c) => c.quantity > 0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isLoggedIn && !hasGuestDetails) {
      e.preventDefault();
      setShowGuestModal(true);
    }
  }

  function handleGuestContinue(details: GuestDetails) {
    setGuestDetails(details);
    setShowGuestModal(false);
    // guestDetails hasn't re-rendered into the hidden inputs yet on this tick, so
    // requestSubmit() here would still submit stale (empty) values — defer the actual
    // submit to an effect that fires once the new details have made it into the DOM.
    autoSubmitRef.current = true;
  }

  useEffect(() => {
    if (autoSubmitRef.current && hasGuestDetails) {
      autoSubmitRef.current = false;
      formRef.current?.requestSubmit();
    }
  }, [hasGuestDetails]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <CountdownTimer expiresAt={lockExpiry} onExpire={() => router.push(`/booking/${showtimeId}/seats`)} />

        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-semibold">Seats</h3>
          <ul className="space-y-1.5 text-sm">
            {seats.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>
                  {s.row}
                  {s.number} <span className="text-muted">({s.category.toLowerCase()})</span>
                </span>
                <span>{formatNaira(s.price)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-semibold">Concessions</h3>
          <ul className="space-y-3">
            {concessions.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.description && <p className="text-xs text-muted">{c.description}</p>}
                  <p className="text-xs text-brand-light">{formatNaira(c.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty(c.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-brand"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-4 text-center text-sm">{quantities[c.id] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => setQty(c.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:border-brand"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-3 font-semibold">Promo Code</h3>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. WELCOME10"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoStatus(null);
              }}
            />
            <Button type="button" variant="outline" onClick={checkPromo} disabled={promoStatus?.checking}>
              <Tag size={15} /> Apply
            </Button>
          </div>
          {promoStatus?.error && <p className="mt-2 text-sm text-danger">{promoStatus.error}</p>}
          {promoStatus?.discount !== undefined && (
            <p className="mt-2 text-sm text-success">Discount applied: {formatNaira(promoStatus.discount)}</p>
          )}
        </section>

        {!isLoggedIn && hasGuestDetails && (
          <section className="flex items-center justify-between rounded-xl border border-border bg-surface p-5">
            <div>
              <h3 className="font-semibold">Your Details</h3>
              <p className="text-sm text-muted">
                {guestDetails.name} · {guestDetails.email} · {guestDetails.phone}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuestModal(true)}
              className="flex items-center gap-1.5 text-sm text-brand-light hover:underline"
            >
              <Pencil size={14} /> Edit
            </button>
          </section>
        )}
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24"
      >
        <input type="hidden" name="showtimeId" value={showtimeId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        {seats.map((s) => (
          <input key={s.id} type="hidden" name="seatIds" value={s.id} />
        ))}
        <input type="hidden" name="concessions" value={JSON.stringify(concessionPayload)} />
        <input type="hidden" name="promoCode" value={promoStatus?.discount !== undefined ? promoCode : ""} />
        {!isLoggedIn && (
          <>
            <input type="hidden" name="guestName" value={guestDetails.name} />
            <input type="hidden" name="guestEmail" value={guestDetails.email} />
            <input type="hidden" name="guestPhone" value={guestDetails.phone} />
          </>
        )}

        <h3 className="font-semibold">Order Summary</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Seats subtotal</span>
            <span>{formatNaira(seatSubtotal)}</span>
          </div>
          {concessionSubtotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Concessions</span>
              <span>{formatNaira(concessionSubtotal)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatNaira(discount)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-semibold">
          <span>Total</span>
          <span className="text-brand-light">{formatNaira(total)}</span>
        </div>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Processing..." : "Proceed to Payment"}
        </Button>
        <p className="text-center text-xs text-muted">You won&rsquo;t be charged until you confirm payment.</p>
      </form>

      {showGuestModal && (
        <GuestDetailsModal initial={guestDetails} onContinue={handleGuestContinue} onClose={() => setShowGuestModal(false)} />
      )}
    </div>
  );
}
