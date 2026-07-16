"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { selectLocationAction } from "@/actions/location";
import { cn } from "@/lib/cn";

export type GateLocation = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export function LocationGate({ locations }: { locations: GateLocation[] }) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => `${l.name} ${l.city} ${l.address}`.toLowerCase().includes(q));
  }, [locations, query]);

  function handleSelect(id: string) {
    if (isPending) return;
    setPendingId(id);
    startTransition(async () => {
      try {
        await selectLocationAction(id);
      } catch (err) {
        // Next.js signals a successful redirect by throwing a special error —
        // only surface a toast for a genuine failure.
        const digest = (err as { digest?: string } | undefined)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setPendingId(null);
        toast.error("Couldn't select that location. Please try again.");
      }
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center"
      >
        <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="mb-6 h-12 w-auto" priority />
        <h1 className="font-sans text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Select Cinema Location
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Choose the OJAJA cinema closest to you to see what&rsquo;s showing and book your seats.
        </p>

        <div className="relative mt-8 w-full max-w-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full rounded-2xl border border-border bg-surface-2/80 py-4 pl-5 pr-12 text-sm text-foreground placeholder:text-muted/60 outline-none transition-all focus:border-brand-light focus:ring-2 focus:ring-brand/40"
          />
          <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        <div className="mt-8 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((loc, i) => (
            <motion.div
              key={loc.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => handleSelect(loc.id)}
                disabled={isPending}
                className={cn(
                  "glow-card group flex h-full w-full flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 disabled:opacity-60",
                  pendingId === loc.id && "border-brand/60"
                )}
              >
                <h2 className="font-sans text-lg font-bold tracking-tight text-foreground group-hover:text-brand-light">
                  {loc.name}
                </h2>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">{loc.address}</p>
              </button>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-sm text-muted">No locations match &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
