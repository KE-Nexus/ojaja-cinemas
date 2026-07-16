import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refunds & Cancellations" };

export default function RefundsPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Refunds &amp; Cancellations</h1>
      <div className="prose prose-invert mt-8 max-w-none space-y-5 text-sm leading-relaxed text-foreground/85">
        <p>
          We want every OJAJA booking to be worry-free. This policy explains when a refund or exchange is available.
        </p>
        <h2 className="text-lg font-semibold text-foreground">Cancelling a booking</h2>
        <p>
          Tickets can be cancelled for a full refund up to 2 hours before the scheduled showtime. Cancellations
          within 2 hours of showtime, or no-shows, are not eligible for a refund.
        </p>
        <h2 className="text-lg font-semibold text-foreground">Showtime changes or cancellations by OJAJA</h2>
        <p>
          If we cancel or reschedule a showtime, you will be notified by email/SMS and offered a full refund or a
          transfer to another showtime of your choice at no extra cost.
        </p>
        <h2 className="text-lg font-semibold text-foreground">How refunds are processed</h2>
        <p>
          Approved refunds are returned to your original payment method within 5–7 business days. Concession items
          already collected are non-refundable.
        </p>
        <h2 className="text-lg font-semibold text-foreground">Private space bookings</h2>
        <p>
          Private hall reservations require 72 hours&rsquo; notice for a full refund of any deposit paid. Cancellations
          within 72 hours forfeit 50% of the deposit.
        </p>
      </div>
    </div>
  );
}
