import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { confirmPaymentAction } from "@/actions/booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatShowtime } from "@/lib/format";
import { ShieldCheck, XCircle, CreditCard } from "lucide-react";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ failed?: string }>;
}) {
  const { reference } = await params;
  const { failed } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: { showtime: { include: { movie: true } } },
  });
  if (!booking) notFound();

  if (booking.status === "CONFIRMED") redirect(`/booking/confirmation/${reference}`);

  const succeedAction = confirmPaymentAction.bind(null, reference, "success");
  const failAction = confirmPaymentAction.bind(null, reference, "fail");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="brand">Test Mode</Badge>
          <span className="text-xs text-muted">No real charge will be made</span>
        </div>

        <h1 className="font-sans text-xl font-bold tracking-tight">Payment</h1>
        <p className="mt-1 text-sm text-muted">
          {booking.showtime.movie.title} · {formatShowtime(booking.showtime.startTime)}
        </p>

        {booking.status === "CANCELLED" || failed ? (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <XCircle size={16} /> Payment failed
            </div>
            Your seats were released. Please select your seats again to retry.
            <div className="mt-3">
              <Button href={`/booking/${booking.showtimeId}/seats`} size="sm" variant="danger">
                Choose Seats Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4">
              <span className="text-sm text-muted">Amount due</span>
              <span className="text-2xl font-semibold text-brand-light">{formatNaira(booking.totalAmount)}</span>
            </div>

            <div className="mt-6 space-y-3">
              <form action={succeedAction}>
                <Button type="submit" className="w-full" size="lg">
                  <ShieldCheck size={18} /> Simulate Successful Payment
                </Button>
              </form>
              <form action={failAction}>
                <Button type="submit" className="w-full" size="lg" variant="outline">
                  <CreditCard size={18} /> Simulate Failed Payment
                </Button>
              </form>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Standing in for a real Paystack/Flutterwave checkout — swap <code>MockPaymentProvider</code> for a real gateway to go live.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
