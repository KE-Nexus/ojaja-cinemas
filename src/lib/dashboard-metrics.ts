import "server-only";
import { prisma } from "@/lib/prisma";

export type PeriodMetrics = { sales: number; ticketSales: number; concessions: number; admits: number };

const emptyMetrics: PeriodMetrics = { sales: 0, ticketSales: 0, concessions: 0, admits: 0 };

function branchWhere(branchId?: string) {
  return branchId ? { showtime: { auditorium: { branchId } } } : {};
}

/** Sales/ticket-revenue/concession-revenue/admits for confirmed bookings in [from, to), optionally scoped to a branch. */
export async function metricsForRange(from: Date, to: Date, branchId?: string): Promise<PeriodMetrics> {
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: from, lt: to }, ...branchWhere(branchId) },
    include: { seats: true, concessions: true },
  });

  return bookings.reduce((acc, b) => {
    const ticketRevenue = b.seats.reduce((s, seat) => s + seat.priceAtBooking, 0);
    const concessionRevenue = b.concessions.reduce((s, c) => s + c.priceAtBooking * c.quantity, 0);
    return {
      sales: acc.sales + b.totalAmount,
      ticketSales: acc.ticketSales + ticketRevenue,
      concessions: acc.concessions + concessionRevenue,
      admits: acc.admits + b.seats.length,
    };
  }, { ...emptyMetrics });
}

export function startOfToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(offsetWeeks = 0) {
  const d = startOfToday();
  d.setDate(d.getDate() - d.getDay() + offsetWeeks * 7);
  return d;
}

export function startOfMonth(offsetMonths = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYear(offsetYears = 0) {
  const d = new Date();
  d.setMonth(0, 1);
  d.setFullYear(d.getFullYear() + offsetYears);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function circuitPeriodBreakdown(branchId?: string): Promise<Record<"daily" | "weekly" | "monthly" | "yearly", PeriodMetrics>> {
  const now = new Date();
  const [daily, weekly, monthly, yearly] = await Promise.all([
    metricsForRange(startOfToday(), now, branchId),
    metricsForRange(startOfWeek(), now, branchId),
    metricsForRange(startOfMonth(), now, branchId),
    metricsForRange(startOfYear(), now, branchId),
  ]);
  return { daily, weekly, monthly, yearly };
}

export type CinemaOverviewRow = {
  totalSales: number;
  ticketSales: number;
  itemSales: number;
  orderCount: number;
  ticketCount: number;
  onlineSales: number;
  onlineCount: number;
};

const emptyOverviewRow: CinemaOverviewRow = {
  totalSales: 0,
  ticketSales: 0,
  itemSales: 0,
  orderCount: 0,
  ticketCount: 0,
  onlineSales: 0,
  onlineCount: 0,
};

/** Order/ticket/online breakdown for [from, to), optionally scoped to a branch — "online" means booked by a
 * signed-in customer directly (no staff processedById), as opposed to a box-office sale. */
async function detailedMetricsForRange(from: Date, to: Date, branchId?: string): Promise<CinemaOverviewRow> {
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: from, lt: to }, ...branchWhere(branchId) },
    include: { seats: true, concessions: true },
  });

  return bookings.reduce((acc, b) => {
    const ticketRevenue = b.seats.reduce((s, seat) => s + seat.priceAtBooking, 0);
    const itemRevenue = b.concessions.reduce((s, c) => s + c.priceAtBooking * c.quantity, 0);
    const isOnline = !b.processedById;
    return {
      totalSales: acc.totalSales + b.totalAmount,
      ticketSales: acc.ticketSales + ticketRevenue,
      itemSales: acc.itemSales + itemRevenue,
      orderCount: acc.orderCount + 1,
      ticketCount: acc.ticketCount + b.seats.length,
      onlineSales: acc.onlineSales + (isOnline ? b.totalAmount : 0),
      onlineCount: acc.onlineCount + (isOnline ? 1 : 0),
    };
  }, { ...emptyOverviewRow });
}

/** All branches' breakdown — CircuitAdmin only; branch-scoped viewers use `metricsForRange`/`detailedMetricsForRange` directly. */
export async function cinemaOverviewBreakdown(from: Date, to: Date) {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    branches.map(async (b) => ({ branchId: b.id, branchName: b.name, ...(await detailedMetricsForRange(from, to, b.id)) }))
  );
}

export async function singleCinemaOverviewRow(from: Date, to: Date, branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  return { branchId, branchName: branch?.name ?? "Your Cinema", ...(await detailedMetricsForRange(from, to, branchId)) };
}

const HOUR_LABELS = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm", "10pm"];

/** Today's sales by hour, business hours only — feeds the Day view of the Sales trend chart. */
export async function hourlySalesToday(branchId?: string): Promise<{ label: string; revenue: number }[]> {
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: startOfToday(), lt: new Date() }, ...branchWhere(branchId) },
    select: { totalAmount: true, createdAt: true },
  });

  const revenueByHour = new Array(24).fill(0);
  for (const b of bookings) revenueByHour[b.createdAt.getHours()] += b.totalAmount;

  return HOUR_LABELS.map((label, i) => ({ label, revenue: revenueByHour[9 + i] ?? 0 }));
}

/** Daily sales for the last N days (inclusive of today) — feeds the Week/Month views of the Sales trend chart. */
export async function dailySalesSeries(days: number, branchId?: string): Promise<{ label: string; revenue: number }[]> {
  const series: { label: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfToday(-i);
    const dayEnd = startOfToday(-i + 1);
    const bookings = await prisma.booking.findMany({
      where: { status: "CONFIRMED", createdAt: { gte: dayStart, lt: dayEnd }, ...branchWhere(branchId) },
      select: { totalAmount: true },
    });
    series.push({
      label: dayStart.toLocaleDateString("en-NG", days > 7 ? { day: "numeric", month: "short" } : { weekday: "short" }),
      revenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
    });
  }
  return series;
}

/** Revenue Per Head (sales / admits) for this week vs. last week, with % change. */
export async function revenuePerHeadWeekChange(branchId?: string) {
  const now = new Date();
  const [thisWeek, lastWeek] = await Promise.all([
    metricsForRange(startOfWeek(), now, branchId),
    metricsForRange(startOfWeek(-1), startOfWeek(), branchId),
  ]);
  const rphThisWeek = thisWeek.admits > 0 ? thisWeek.sales / thisWeek.admits : 0;
  const rphLastWeek = lastWeek.admits > 0 ? lastWeek.sales / lastWeek.admits : 0;
  const pctChange = rphLastWeek > 0 ? ((rphThisWeek - rphLastWeek) / rphLastWeek) * 100 : null;
  return { rphThisWeek, rphLastWeek, pctChange };
}

export async function grossBoxOfficeToday(branchId?: string) {
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: startOfToday(), lt: new Date() }, ...branchWhere(branchId) },
    include: { showtime: { include: { movie: true } }, seats: true },
  });

  const byMovie = new Map<string, number>();
  for (const b of bookings) {
    const ticketRevenue = b.seats.reduce((s, seat) => s + seat.priceAtBooking, 0);
    byMovie.set(b.showtime.movie.title, (byMovie.get(b.showtime.movie.title) ?? 0) + ticketRevenue);
  }
  return Array.from(byMovie.entries())
    .map(([title, revenue]) => ({ title, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function concessionSalesToday(branchId?: string) {
  const items = await prisma.bookingConcession.findMany({
    where: {
      booking: { status: "CONFIRMED", createdAt: { gte: startOfToday(), lt: new Date() }, ...branchWhere(branchId) },
    },
    include: { posItem: true },
  });

  const byItem = new Map<string, { name: string; quantity: number; total: number }>();
  for (const c of items) {
    const entry = byItem.get(c.posItemId) ?? { name: c.posItem.name, quantity: 0, total: 0 };
    entry.quantity += c.quantity;
    entry.total += c.priceAtBooking * c.quantity;
    byItem.set(c.posItemId, entry);
  }
  return Array.from(byItem.values()).sort((a, b) => b.total - a.total);
}
