import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Terms of Service</h1>
      <div className="mt-8 max-w-none space-y-5 text-sm leading-relaxed text-foreground/85">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the OJAJA Cinemas website and booking
          platform (&ldquo;Service&rdquo;), operated by OJAJA Cinemas Limited. By creating an account or booking a
          ticket, you agree to these Terms.
        </p>
        <h2 className="text-lg font-semibold text-foreground">1. Bookings</h2>
        <p>
          Each booking reference and e-ticket is valid only for the movie, showtime, and seats specified. Tickets
          are non-transferable to other showtimes without our consent.
        </p>
        <h2 className="text-lg font-semibold text-foreground">2. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity
          under your account.
        </p>
        <h2 className="text-lg font-semibold text-foreground">3. Conduct</h2>
        <p>
          Guests must comply with our <a href="/house-rules" className="text-brand-light hover:underline">House Rules</a>{" "}
          at all times. We reserve the right to refuse entry or remove guests who violate these rules without a refund.
        </p>
        <h2 className="text-lg font-semibold text-foreground">4. Payments</h2>
        <p>
          All prices are listed in Nigerian Naira (₦) and are inclusive of applicable taxes unless stated otherwise.
          Payments are processed by our third-party payment partners; we do not store your card details.
        </p>
        <h2 className="text-lg font-semibold text-foreground">5. Limitation of liability</h2>
        <p>
          OJAJA Cinemas is not liable for indirect or consequential losses arising from use of the Service, to the
          maximum extent permitted by Nigerian law.
        </p>
        <h2 className="text-lg font-semibold text-foreground">6. Changes</h2>
        <p>We may update these Terms from time to time. Continued use of the Service constitutes acceptance of the revised Terms.</p>
      </div>
    </div>
  );
}
