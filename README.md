# OJAJA Cinemas

A full-stack cinema ticketing platform for `ojaja.reachcinema.io` — public booking site plus a staff/management back-office portal — built with Next.js (App Router), TypeScript, Tailwind CSS, and Prisma.

## Stack

- **Next.js 16 (App Router) + TypeScript**, Tailwind CSS v4, Framer Motion, Recharts, `lucide-react`
- **Prisma ORM + SQLite** (file-based dev database at `prisma/dev.db`, swappable to Postgres by changing the `datasource` block)
- **Auth**: custom email/password (bcrypt-hashed), signed httpOnly JWT session cookie (`jose`), role-based access control (`CUSTOMER`, `BOX_OFFICE`, `MARKETING`, `MANAGER`, `ADMIN`)
- **Payments / SMS / Email**: interface-based providers (`src/lib/providers/`) with mock implementations — see [Stubbed vs. production-ready](#stubbed-vs-production-ready) below

## Getting Started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run seed              # seeds demo movies, branches, showtimes, accounts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site, and [http://localhost:3000/admin](http://localhost:3000/admin) for the staff portal.

### Demo accounts

All seeded accounts use the password **`Password123!`**

| Role | Email |
|---|---|
| Admin | `admin@ojaja.cinema` |
| Manager | `manager@ojaja.cinema` |
| Box Office | `boxoffice@ojaja.cinema` |
| Marketing | `marketing@ojaja.cinema` |
| Customer | `customer@example.com` |

### Useful commands

```bash
npx prisma studio    # inspect/edit the database visually
npm run seed          # re-run the seed script (safe to run repeatedly)
npm run build         # production build + type-check
npm run lint          # ESLint
```

### Importing real movies from TMDB (optional)

By default the seed script populates the catalog with a fictional-but-realistic set of movies. To seed with **real** movies (real posters, backdrops, cast, director, runtime, and trailers) instead:

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup) and request an API key at **Settings → API** (the "Developer" use case is fine — no payment or approval wait required).
2. Add it to `.env`:
   ```
   TMDB_API_KEY="your-key-here"
   ```
3. Re-run `npm run seed`. It fetches TMDB's current "Now Playing" and "Upcoming" lists (~18 movies), enriches each with runtime/cast/director/trailer via TMDB's detail endpoints, and imports them in place of the fictional catalog. Showtimes, branches, and pricing are still generated locally exactly as before — only the movie metadata comes from TMDB.

If `TMDB_API_KEY` isn't set, or the TMDB request fails for any reason, the seed script automatically falls back to the built-in fictional catalog — the app never breaks because of this integration. See `src/lib/tmdb.ts` for the client and `prisma/seed.ts`'s `buildMovieSeedData()` for the import/fallback logic.

## Architecture

- `prisma/schema.prisma` — full data model (users, branches, auditoriums, seats, movies, showtimes, bookings, seat locks, payments, reviews, promo codes, space requests, notifications, audit log)
- `src/lib/` — core business logic: auth/session, seat locking & pricing (`booking.ts`), payment/notification provider interfaces, formatting (₦ currency, WAT timezone), zod validation schemas
- `src/actions/` — Server Actions for all mutations (booking flow, auth, reviews, contact/space requests, and `src/actions/admin/*` for the back-office)
- `src/app/(site)/` — public site (route group, wrapped with the customer header/footer)
- `src/app/admin/` — staff portal, split into `(auth)` (login, no sidebar) and `(dashboard)` (sidebar shell + role guard) route groups
- `src/app/api/` — a small REST surface (`/api/seats/[showtimeId]`, `/api/promo`) usable by a future native mobile client

### Seat locking

No background cron/sweeper job. Seat availability is computed **lazily at read time** as *not booked AND (no active lock OR lock expired)* — this self-heals without extra infrastructure, which is the right tradeoff for a single-instance deployment. Locks last 10 minutes from the moment a customer proceeds to checkout.

### Booking flow

`Movie → Showtime → Seat selection (locks seats) → Checkout (concessions + promo code) → Mock payment → Confirmation (QR e-ticket)`. Guest checkout is supported throughout; logged-in customers get booking history under `/account`.

## Stubbed vs. production-ready

This build has a **real database, real auth, and real business logic** (seat locking, pricing, promo codes, refunds, RBAC, audit logging). The following are intentionally stubbed behind clean interfaces, since no external accounts were available to wire up:

| Concern | Current state | To go live |
|---|---|---|
| Movie catalog | Fictional by default; **real** movies (TMDB) available opt-in — see [Importing real movies from TMDB](#importing-real-movies-from-tmdb-optional) | Already production-capable once `TMDB_API_KEY` is set |
| Payments | `MockPaymentProvider` (`src/lib/providers/payment.ts`) — "Simulate Successful/Failed Payment" buttons stand in for a real checkout redirect | Implement the same `PaymentProvider` interface against Paystack/Flutterwave |
| Email & SMS | `MockNotificationProvider` (`src/lib/providers/notification.ts`) logs to the `NotificationOutbox` table, viewable at `/admin/notifications` | Implement `NotificationProvider` against Resend/SendGrid (email) and Termii (SMS) |
| MFA / advanced auth hardening | Password + session cookie only | Add TOTP/MFA for staff roles before production |
| Full WCAG AA audit | Baseline accessibility only (semantic HTML, alt text, focus states, contrast-checked palette) | Run a full audit with a screen reader and automated tooling |
| Load/performance testing | Not performed | Load-test the booking/payment path before a real launch |
| i18n, ticket-scanning app, waitlists, live chat | Not built (flagged as gaps in the original SRS) | Separate scoped projects |
| Deployment, TLS, CI/CD | Not configured — this is a local dev build | Set up hosting, HTTPS, and a deploy pipeline |

## Note on verification

Every route was verified to compile and render via `npm run build`/`tsc --noEmit` (all 40 routes build cleanly) and via direct HTTP checks against the running dev server. The full booking lifecycle (seat lock → pending booking → promo discount → payment confirmation → notification → confirmation lookup) was also verified end-to-end with a scripted test against the real database. Interactive browser testing (clicking through forms, the seat map, admin login) was **not** performed in a live browser, since no browser-automation tool was available in this environment — recommend clicking through the golden paths above before treating this as fully verified.
