"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Film, PartyPopper, Mail } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/book-a-space", label: "Book a Space", icon: PartyPopper },
  { href: "/contact", label: "Contact", icon: Mail },
];

export function SiteSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r border-white/5 bg-surface md:flex">
      <Link href="/" className="flex items-center px-5 py-5">
        <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="h-9 w-auto" priority />
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand/15 text-brand-light" : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[linear-gradient(180deg,var(--brand-light),var(--accent-cyan))]" />
              )}
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Link
          href="/book-a-space"
          className="glow-card block rounded-xl bg-gradient-to-br from-brand/20 via-surface-2 to-surface-2 p-4 transition-colors hover:from-brand/30"
        >
          <PartyPopper size={18} className="mb-2 text-brand-light" />
          <p className="text-sm font-semibold">Host an Event</p>
          <p className="mt-0.5 text-xs text-muted">Private screenings for birthdays &amp; premieres.</p>
        </Link>
      </div>
    </aside>
  );
}
