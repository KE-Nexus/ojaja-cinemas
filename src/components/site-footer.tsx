import Link from "next/link";
import Image from "next/image";
import { Globe, MessageCircle, Send, MapPin, Phone } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/logo-mark.png" alt="OJAJA Cinemas" width={441} height={229} className="h-9 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted">
              Nigeria&rsquo;s home for big-screen premieres, private screenings, and unforgettable nights out.
            </p>
            <div className="mt-4 flex gap-3 text-muted">
              <Globe size={18} />
              <MessageCircle size={18} />
              <Send size={18} />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Explore</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/movies" className="hover:text-brand-light">Now Showing</Link></li>
              <li><Link href="/showtimes" className="hover:text-brand-light">Showtimes</Link></li>
              <li><Link href="/locations" className="hover:text-brand-light">Locations</Link></li>
              <li><Link href="/book-a-space" className="hover:text-brand-light">Book a Space</Link></li>
              <li><Link href="/house-rules" className="hover:text-brand-light">House Rules</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/contact" className="hover:text-brand-light">Contact Us</Link></li>
              <li><Link href="/policies/refunds" className="hover:text-brand-light">Refunds &amp; Cancellations</Link></li>
              <li><Link href="/policies/terms" className="hover:text-brand-light">Terms of Service</Link></li>
              <li><Link href="/policies/privacy" className="hover:text-brand-light">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Head Office</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" /> African Village @ Ife Grand Resort, Ile-Ife, Osun State
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0" /> +234 36 700 1000
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} OJAJA Cinemas. All rights reserved.</p>
          <p>Prices shown in Nigerian Naira (₦). Showtimes in West Africa Time (WAT).</p>
        </div>
        {process.env.TMDB_API_KEY && (
          <p className="mt-4 text-center text-[11px] text-muted/70">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        )}
      </div>
    </footer>
  );
}
