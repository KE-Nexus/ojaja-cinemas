"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Ticket,
  MapPin,
  Search,
  Home,
  Film,
  PartyPopper,
  Mail,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { clearLocationAction } from "@/actions/location";
import { isStaffRole, type SessionPayload } from "@/lib/roles";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/book-a-space", label: "Book a Space", icon: PartyPopper },
  { href: "/contact", label: "Contact", icon: Mail },
];

export function HeaderClient({ session, cityName }: { session: SessionPayload | null; cityName: string | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    if (!isHome) return;
    function onScroll() {
      setScrolled(window.scrollY > 60);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const transparent = isHome && !scrolled && !mobileOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        transparent ? "border-b border-transparent bg-transparent" : "glass border-b border-white/5"
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center md:hidden">
          <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="h-8 w-auto" priority />
        </Link>

        <form action="/movies" className="relative hidden max-w-sm flex-1 md:block">
          <input
            type="search"
            name="q"
            placeholder="Search movies..."
            className="w-full rounded-full border border-border bg-surface-2/80 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-brand-light"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </form>

        <div className="hidden items-center gap-3 md:flex">
          {cityName && (
            <form action={clearLocationAction}>
              <button
                type="submit"
                title="Change location"
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/50 hover:text-brand-light"
              >
                <MapPin size={13} /> {cityName}
              </button>
            </form>
          )}
          <ThemeToggle />
          {session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:border-brand/60"
              >
                <User size={16} />
                {session.name.split(" ")[0]}
                <ChevronDown size={14} className={cn("transition-transform", menuOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="glass glow-card absolute right-0 mt-2 w-52 overflow-hidden rounded-xl"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <Link
                      href="/account"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Ticket size={15} /> My Bookings
                    </Link>
                    {isStaffRole(session.role) && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
                      >
                        <LayoutDashboard size={15} /> Admin Portal
                      </Link>
                    )}
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-white/5"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/register"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)] transition-colors hover:bg-brand-light active:brightness-95"
            >
              Sign up
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass overflow-hidden border-b border-white/5 md:hidden"
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              <form action="/movies" className="relative mb-2">
                <input
                  type="search"
                  name="q"
                  placeholder="Search movies..."
                  className="w-full rounded-full border border-border bg-surface-2/80 py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/60 outline-none"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              </form>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/5"
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon size={16} /> {link.label}
                </Link>
              ))}
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium">
                Appearance
                <ThemeToggle />
              </div>
              {cityName && (
                <form action={clearLocationAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-white/5"
                  >
                    <MapPin size={15} /> {cityName} <span className="ml-auto text-xs text-muted">Change</span>
                  </button>
                </form>
              )}
              <div className="my-2 border-t border-border" />
              {session ? (
                <>
                  <Link href="/account" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/5">
                    My Bookings
                  </Link>
                  {isStaffRole(session.role) && (
                    <Link href="/admin" className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-white/5">
                      Admin Portal
                    </Link>
                  )}
                  <form action={logoutAction}>
                    <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-danger hover:bg-white/5">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/register" className="rounded-lg bg-brand px-3 py-2.5 text-sm font-medium text-white">
                  Sign up
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
