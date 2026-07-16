"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Tag } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { createPendingBookingAction, type FormState } from "@/actions/booking";
import { formatNaira } from "@/lib/format";
import type { SeatCategory } from "@prisma/client";

type LockedSeat = { id: string; row: string; number: number; category: SeatCategory; price: number };
type Concession = { id: string; name: string; description: string | null; price: number };

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
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<{ discount?: number; error?: string; checking?: boolean } | null>(null);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPendingBookingAction, null);

  const seatSubtotal = seats.reduce((sum, s) => sum + s.price, 0);
  const concessionSubtotal = useMemo(
    () => concessions.reduce((sum, c) => sum + (quantities[c.id] ?? 0) * c.price, 0),
    [concessions, quantities]
  );
  const subtotal = seatSubtotal + concessionSubtotal;
  const discount = promoStatus?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

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

        {!isLoggedIn && (
          <section className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 font-semibold">Your Details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="guestName">Full name</Label>
                <Input id="guestName" name="guestName" required />
              </div>
              <div>
                <Label htmlFor="guestEmail">Email</Label>
                <Input id="guestEmail" name="guestEmail" type="email" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="guestPhone">Phone number</Label>
                <Input id="guestPhone" name="guestPhone" required />
              </div>
            </div>
          </section>
        )}
      </div>

      <form
        action={formAction}
        className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24"
      >
        <input type="hidden" name="showtimeId" value={showtimeId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        {seats.map((s) => (
          <input key={s.id} type="hidden" name="seatIds" value={s.id} />
        ))}
        <input type="hidden" name="concessions" value={JSON.stringify(concessionPayload)} />
        <input type="hidden" name="promoCode" value={promoStatus?.discount !== undefined ? promoCode : ""} />

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
    </div>
  );
}
