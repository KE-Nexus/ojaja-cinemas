import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira, formatShowtime } from "@/lib/format";
import type { Prisma } from "@prisma/client";

const STATUS_TONE = {
  CONFIRMED: "success",
  PENDING: "gold",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
} as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const where: Prisma.BookingWhereInput = q
    ? {
        OR: [
          { reference: { contains: q } },
          { guestEmail: { contains: q } },
          { guestName: { contains: q } },
          { user: { email: { contains: q } } },
          { user: { name: { contains: q } } },
        ],
      }
    : {};

  const bookings = await prisma.booking.findMany({
    where,
    include: { showtime: { include: { movie: true } }, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted">{bookings.length} results</p>
        </div>
        <Button href="/admin/bookings/new">
          <Plus size={16} /> Box-Office Sale
        </Button>
      </div>

      <form method="get" className="mb-4">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search by reference, name, or email..." className="max-w-sm" />
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Reference</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Movie</th>
              <th className="p-3 font-medium">Showtime</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-border/50">
                <td className="p-3">
                  <Link href={`/admin/bookings/${b.reference}`} className="font-mono text-xs text-brand-light hover:underline">
                    {b.reference}
                  </Link>
                </td>
                <td className="p-3">{b.guestName ?? b.user?.name}</td>
                <td className="p-3">{b.showtime.movie.title}</td>
                <td className="p-3 text-muted">{formatShowtime(b.showtime.startTime)}</td>
                <td className="p-3">{formatNaira(b.totalAmount)}</td>
                <td className="p-3">
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
