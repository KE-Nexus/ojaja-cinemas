import { notFound } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/decor/reveal";
import { formatNaira, formatShowtime } from "@/lib/format";
import { CheckCircle2, MapPin } from "lucide-react";

export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      showtime: { include: { movie: true, auditorium: { include: { branch: true } } } },
      seats: { include: { seat: true }, orderBy: { seat: { number: "asc" } } },
      concessions: { include: { posItem: true } },
      user: true,
    },
  });

  if (!booking || booking.status !== "CONFIRMED") notFound();

  const qrDataUrl = await QRCode.toDataURL(booking.reference, { margin: 1, width: 220 });
  const contactName = booking.guestName ?? booking.user?.name ?? "Guest";

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6 flex flex-col items-center text-center">
        <CheckCircle2 size={40} className="mb-2 text-success" />
        <h1 className="font-sans text-2xl font-bold tracking-tight">Booking Confirmed</h1>
        <p className="text-sm text-muted">A confirmation was sent to your email and phone.</p>
      </div>

      <Reveal>
        <div id="e-ticket" className="glow-brand relative overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="relative h-40 w-full">
            <Image src={booking.showtime.movie.backdropUrl ?? booking.showtime.movie.posterUrl} alt="" fill unoptimized referrerPolicy="no-referrer" className="object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
            <div className="absolute bottom-3 left-5">
              <Badge tone="brand">{booking.reference}</Badge>
            </div>
          </div>

          <div className="relative grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
            <div className="hidden sm:block">
              <div className="absolute -top-3 right-[168px] h-6 w-6 rounded-full bg-background" />
              <div className="absolute -bottom-3 right-[168px] h-6 w-6 rounded-full bg-background" />
              <div className="absolute bottom-3 top-3 right-[180px] border-l border-dashed border-border" />
            </div>

            <div>
              <h2 className="font-display text-2xl tracking-wide">{booking.showtime.movie.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={14} /> {booking.showtime.auditorium.branch.name} · {booking.showtime.auditorium.name}
              </p>
              <p className="text-sm text-muted">{formatShowtime(booking.showtime.startTime)}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted">Guest</p>
                  <p className="font-medium">{contactName}</p>
                </div>
                <div>
                  <p className="text-muted">Seats</p>
                  <p className="font-medium">{booking.seats.map((s) => `${s.seat.row}${s.seat.number}`).join(", ")}</p>
                </div>
              </div>

              {booking.concessions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted">Concessions</p>
                  <ul className="text-sm">
                    {booking.concessions.map((c) => (
                      <li key={c.id}>
                        {c.quantity}x {c.posItem.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-semibold">
                <span>Total Paid</span>
                <span className="text-brand-light">{formatNaira(booking.totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Booking QR code" width={140} height={140} className="rounded-lg bg-white p-2" />
              <p className="text-center text-xs text-muted">Show this at the entrance</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
