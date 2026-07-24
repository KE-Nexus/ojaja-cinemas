import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/format";
import { Ticket, TrendingUp, Armchair, Star } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Input, Select, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  circuitPeriodBreakdown,
  perBranchBreakdown,
  revenuePerHeadWeekChange,
  grossBoxOfficeToday,
  concessionSalesToday,
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "@/lib/dashboard-metrics";

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

const PERIOD_LABELS = { daily: "Today", weekly: "This Week", monthly: "This Month", yearly: "This Year" } as const;
const METRIC_LABELS = { sales: "Sales", ticketSales: "Ticket Sales", concessions: "Concessions", admits: "Guest Admits" } as const;

function resolveOverviewRange(period: string | undefined, from: string | undefined, to: string | undefined) {
  const now = new Date();
  switch (period) {
    case "week":
      return { start: startOfWeek(), end: now };
    case "month":
      return { start: startOfMonth(), end: now };
    case "year":
      return { start: startOfYear(), end: now };
    case "custom":
      return {
        start: from ? new Date(`${from}T00:00:00`) : startOfToday(),
        end: to ? new Date(new Date(`${to}T00:00:00`).getTime() + 24 * 60 * 60 * 1000) : now,
      };
    default:
      return { start: startOfToday(), end: now };
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { period, from, to } = await searchParams;
  const todayStart = startOfDay();
  const todayEnd = startOfDay(1);
  const overviewRange = resolveOverviewRange(period, from, to);

  const [
    todayBookings,
    pendingReviews,
    newSpaceRequests,
    todaysShowtimes,
    bookedSeatsToday,
    recentBookings,
    circuit,
    rph,
    boxOfficeToday,
    concessionsToday,
    perBranch,
  ] = await Promise.all([
    prisma.booking.findMany({ where: { status: "CONFIRMED", createdAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.spaceBookingRequest.count({ where: { status: "NEW" } }),
    prisma.showtime.findMany({
      where: { startTime: { gte: todayStart, lt: todayEnd } },
      include: { auditorium: true },
    }),
    prisma.bookingSeat.count({
      where: { booking: { status: "CONFIRMED", showtime: { startTime: { gte: todayStart, lt: todayEnd } } } },
    }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED" },
      include: { showtime: { include: { movie: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    circuitPeriodBreakdown(),
    revenuePerHeadWeekChange(),
    grossBoxOfficeToday(),
    concessionSalesToday(),
    perBranchBreakdown(overviewRange.start, overviewRange.end),
  ]);

  const totalSeatsToday = todaysShowtimes.reduce((sum, st) => sum + st.auditorium.rows * st.auditorium.seatsPerRow, 0);
  const revenue = todayBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const occupancy = totalSeatsToday > 0 ? Math.round((bookedSeatsToday / totalSeatsToday) * 100) : 0;

  const revenueByDay: { date: string; revenue: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = startOfDay(-6 + i);
    const dayEnd = startOfDay(-5 + i);
    const bookings = await prisma.booking.findMany({
      where: { status: "CONFIRMED", createdAt: { gte: dayStart, lt: dayEnd } },
    });
    revenueByDay.push({
      date: dayStart.toLocaleDateString("en-NG", { weekday: "short" }),
      revenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
    });
  }

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted">Overview of today&rsquo;s performance across all cinemas.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<TrendingUp size={18} />} label="Today's Revenue" value={formatNaira(revenue)} />
        <StatCard icon={<Ticket size={18} />} label="Today's Bookings" value={String(todayBookings.length)} />
        <StatCard icon={<Armchair size={18} />} label="Today's Occupancy" value={`${occupancy}%`} />
        <StatCard icon={<Star size={18} />} label="Pending Reviews" value={String(pendingReviews)} />
      </div>

      {/* Data in circuit */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Data in Circuit</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-2 font-medium">Metric</th>
                {Object.values(PERIOD_LABELS).map((label) => (
                  <th key={label} className="p-2 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[]).map((metric) => (
                <tr key={metric} className="border-b border-border/50 last:border-0">
                  <td className="p-2 font-medium">{METRIC_LABELS[metric]}</td>
                  {(Object.keys(PERIOD_LABELS) as (keyof typeof PERIOD_LABELS)[]).map((p) => (
                    <td key={p} className="p-2 text-muted">
                      {metric === "admits" ? circuit[p][metric] : formatNaira(circuit[p][metric])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-2 font-semibold">Revenue Per Head</h2>
          <p className="text-2xl font-semibold">{formatNaira(rph.rphThisWeek)}</p>
          <p className="mt-1 text-xs text-muted">
            {rph.pctChange === null ? (
              "No data for last week to compare."
            ) : (
              <span className={rph.pctChange >= 0 ? "text-success" : "text-danger"}>
                {rph.pctChange >= 0 ? "+" : ""}
                {rph.pctChange.toFixed(1)}%
              </span>
            )}{" "}
            vs. last week ({formatNaira(rph.rphLastWeek)})
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Gross Box Office Today</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="p-2 font-medium">Title</th>
                  <th className="p-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {boxOfficeToday.map((m) => (
                  <tr key={m.title} className="border-b border-border/50 last:border-0">
                    <td className="p-2">{m.title}</td>
                    <td className="p-2 text-muted">{formatNaira(m.revenue)}</td>
                  </tr>
                ))}
                {boxOfficeToday.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted">
                      No box office sales yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Concession Sales Today</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-2 font-medium">Number</th>
                <th className="p-2 font-medium">Item</th>
                <th className="p-2 font-medium">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {concessionsToday.map((c) => (
                <tr key={c.name} className="border-b border-border/50 last:border-0">
                  <td className="p-2 text-muted">{c.quantity}</td>
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-muted">{formatNaira(c.total)}</td>
                </tr>
              ))}
              {concessionsToday.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted">
                    No concession sales yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Revenue — Last 7 Days</h2>
          <RevenueChart data={revenueByDay} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold">Needs Attention</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted">Pending review approvals</span>
              <span className="font-medium">{pendingReviews}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">New space requests</span>
              <span className="font-medium">{newSpaceRequests}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Overview by cinema */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Overview by Cinema</h2>

        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <Label>Period</Label>
            <Select name="period" defaultValue={period ?? "today"}>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          <div>
            <Label>From</Label>
            <Input name="from" type="date" defaultValue={from ?? ""} />
          </div>
          <div>
            <Label>To</Label>
            <Input name="to" type="date" defaultValue={to ?? ""} />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-2 font-medium">Cinema</th>
                <th className="p-2 font-medium">Sales</th>
                <th className="p-2 font-medium">Ticket Sales</th>
                <th className="p-2 font-medium">Concessions</th>
                <th className="p-2 font-medium">Guest Admits</th>
              </tr>
            </thead>
            <tbody>
              {perBranch.map((b) => (
                <tr key={b.branchId} className="border-b border-border/50 last:border-0">
                  <td className="p-2 font-medium">{b.branchName}</td>
                  <td className="p-2 text-muted">{formatNaira(b.sales)}</td>
                  <td className="p-2 text-muted">{formatNaira(b.ticketSales)}</td>
                  <td className="p-2 text-muted">{formatNaira(b.concessions)}</td>
                  <td className="p-2 text-muted">{b.admits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-4 font-semibold">Recent Confirmed Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Movie</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => (
                <tr key={b.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">{b.reference}</td>
                  <td className="py-2 pr-4">{b.showtime.movie.title}</td>
                  <td className="py-2 pr-4">{formatNaira(b.totalAmount)}</td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-muted">
                    No confirmed bookings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-8 border-t border-border pt-5 text-center text-xs text-muted">
        OJAJA Cinemas Office &middot; Circuit Management Dashboard &middot; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glow-card group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/10 blur-2xl transition-colors group-hover:bg-brand/20" />
      <div className="relative mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand-light">{icon}</div>
      <p className="relative text-2xl font-semibold">{value}</p>
      <p className="relative text-sm text-muted">{label}</p>
    </div>
  );
}
