"use client";

import Link from "next/link";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/decor/reveal";

export type LocationCardData = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  openingHours: string;
  screenCount: number;
};

export function LocationsSection({ locations }: { locations: LocationCardData[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-10">
      <Reveal>
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Choose Your Cinema</h2>
            <p className="mt-1 text-sm text-muted">Pick a location to see what&rsquo;s playing near you.</p>
          </div>
          <Link href="/locations" className="hidden text-sm font-medium text-brand-light hover:underline sm:block">
            All locations
          </Link>
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-3">
        {locations.map((loc, i) => (
          <Reveal key={loc.id} delay={i * 0.08}>
            <Link
              href={`/showtimes?branch=${loc.id}`}
              className="glow-card group relative block h-full overflow-hidden rounded-xl border border-white/5 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
            >
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/10 blur-2xl transition-colors group-hover:bg-brand/20" />
              <div className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand-light">
                <MapPin size={20} />
              </div>
              <h3 className="relative font-sans text-lg font-bold tracking-tight">{loc.city}</h3>
              <p className="relative mt-1 text-sm text-muted">{loc.name}</p>
              <p className="relative mt-3 line-clamp-2 text-xs text-muted">{loc.address}</p>
              <div className="relative mt-4 space-y-1.5 text-xs text-muted">
                <p className="flex items-center gap-1.5">
                  <Clock size={12} className="shrink-0" /> {loc.openingHours}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone size={12} className="shrink-0" /> {loc.phone}
                </p>
              </div>
              <div className="relative mt-5 flex items-center gap-1.5 text-sm font-medium text-brand-light">
                {loc.screenCount} screens
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
