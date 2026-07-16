import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNaira, formatShowtime } from "@/lib/format";
import { Ticket, Star, Mail, Phone } from "lucide-react";

export const metadata: Metadata = { title: "My Account" };

const STATUS_TONE = {
  CONFIRMED: "success",
  PENDING: "gold",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
} as const;

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, bookings] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub } }),
    prisma.booking.findMany({
      where: { userId: session.sub },
      include: { showtime: { include: { movie: true, auditorium: { include: { branch: true } } } }, seats: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">{user.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Mail size={14} /> {user.email}
            </p>
            {user.phone && (
              <p className="flex items-center gap-2">
                <Phone size={14} /> {user.phone}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold">
          <Star size={16} /> {user.loyaltyPoints} loyalty points
        </div>
      </div>

      <h2 className="mb-4 font-sans text-xl font-bold tracking-tight">My Bookings</h2>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <Ticket size={28} className="mx-auto mb-2 text-muted" />
          <p className="text-muted">You haven&rsquo;t booked any tickets yet.</p>
          <Button href="/movies" className="mt-4">
            Browse Movies
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{b.showtime.movie.title}</p>
                <p className="text-sm text-muted">
                  {b.showtime.auditorium.branch.name} · {formatShowtime(b.showtime.startTime)} · {b.seats.length} seat
                  {b.seats.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted">Ref: {b.reference}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatNaira(b.totalAmount)}</span>
                <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                {b.status === "CONFIRMED" && (
                  <Link href={`/booking/confirmation/${b.reference}`} className="text-sm text-brand-light hover:underline">
                    View
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
