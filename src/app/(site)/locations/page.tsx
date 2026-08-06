import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MapPin, Phone, Clock } from "lucide-react";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" }, include: { auditoriums: true } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-sans text-3xl font-bold tracking-tight">Our Cinemas</h1>
      <p className="mt-2 text-muted">Find the OJAJA closest to you.</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {branches.map((b) => (
          <Link
            key={b.id}
            href={`/locations/${b.slug}`}
            className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-brand/40"
          >
            <h2 className="font-sans text-xl font-bold tracking-tight">{b.name}</h2>
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" /> {b.address}, {b.city}
              </p>
              <p className="flex items-center gap-2">
                <Phone size={16} className="shrink-0" /> {b.phone}
              </p>
              <p className="flex items-center gap-2">
                <Clock size={16} className="shrink-0" /> {b.openingHours}
              </p>
            </div>
            <p className="mt-3 text-xs text-muted">
              {b.auditoriums.length} screens · {b.auditoriums.map((a) => a.screenType).join(", ")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
