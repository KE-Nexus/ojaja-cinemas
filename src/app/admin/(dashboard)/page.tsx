import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/format";
import { Ticket, TrendingUp, Armchair, Star } from "lucide-react";
import { RevenueChart } from "@/components/admin/revenue-chart";

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboardPage() {
  const todayStart = startOfDay();
  const todayEnd = startOfDay(1);

  const [todayBookings, pendingReviews, newSpaceRequests, todaysShowtimes, bookedSeatsToday, recentBookings] =
    await Promise.all([
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
