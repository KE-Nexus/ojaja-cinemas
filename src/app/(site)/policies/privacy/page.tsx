import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <div className="mt-8 max-w-none space-y-5 text-sm leading-relaxed text-foreground/85">
        <p>
          OJAJA Cinemas Limited (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting your personal data in
          accordance with the Nigeria Data Protection Act (NDPA) and the Nigeria Data Protection Regulation (NDPR).
        </p>
        <h2 className="text-lg font-semibold text-foreground">What we collect</h2>
        <p>Name, email, phone number, booking history, and payment confirmation status (never full card details).</p>
        <h2 className="text-lg font-semibold text-foreground">Why we collect it</h2>
        <p>
          To process bookings and payments, send booking confirmations and reminders, respond to enquiries, and
          improve our service.
        </p>
        <h2 className="text-lg font-semibold text-foreground">Who we share it with</h2>
        <p>
          Payment processors, SMS/email delivery providers, and analytics providers acting on our behalf under data
          protection agreements. We do not sell personal data.
        </p>
        <h2 className="text-lg font-semibold text-foreground">Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data at any time by contacting{" "}
          <a href="/contact" className="text-brand-light hover:underline">
            our support team
          </a>
          .
        </p>
        <h2 className="text-lg font-semibold text-foreground">Data retention</h2>
        <p>We retain booking records for as long as necessary for accounting, legal, and customer support purposes.</p>
      </div>
    </div>
  );
}
