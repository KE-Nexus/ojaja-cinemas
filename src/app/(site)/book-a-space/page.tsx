import type { Metadata } from "next";
import { PartyPopper, Briefcase, Heart, Film } from "lucide-react";
import { SpaceBookingForm } from "@/components/space-booking-form";

export const metadata: Metadata = { title: "Book a Space" };

export default function BookASpacePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Book a Private Space</h1>
      <p className="mt-2 text-muted">
        Host your birthday party, corporate screening, premiere, or celebration in one of our private halls.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Feature icon={<PartyPopper size={18} />} label="Birthdays" />
        <Feature icon={<Briefcase size={18} />} label="Corporate" />
        <Feature icon={<Heart size={18} />} label="Weddings" />
        <Feature icon={<Film size={18} />} label="Premieres" />
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <SpaceBookingForm />
      </div>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center text-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand-light">{icon}</div>
      {label}
    </div>
  );
}
