import "server-only";
import { prisma } from "@/lib/prisma";

export type PeriodMetrics = { sales: number; ticketSales: number; concessions: number; admits: number };

const emptyMetrics: PeriodMetrics = { sales: 0, ticketSales: 0, concessions: 0, admits: 0 };

/** Sales/ticket-revenue/concession-revenue/admits for confirmed bookings in [from, to), optionally scoped to a branch. */
export async function metricsForRange(from: Date, to: Date, branchId?: string): Promise<PeriodMetrics> {
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      createdAt: { gte: from, lt: to },
      ...(branchId ? { showtime: { auditorium: { branchId } } } : {}),
    },
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

export async function circuitPeriodBreakdown(): Promise<Record<"daily" | "weekly" | "monthly" | "yearly", PeriodMetrics>> {
  const now = new Date();
  const [daily, weekly, monthly, yearly] = await Promise.all([
    metricsForRange(startOfToday(), now),
    metricsForRange(startOfWeek(), now),
    metricsForRange(startOfMonth(), now),
    metricsForRange(startOfYear(), now),
  ]);
  return { daily, weekly, monthly, yearly };
}

export async function perBranchBreakdown(from: Date, to: Date) {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  return Promise.all(
    branches.map(async (b) => ({ branchId: b.id, branchName: b.name, ...(await metricsForRange(from, to, b.id)) }))
  );
}

/** Revenue Per Head (sales / admits) for this week vs. last week, with % change. */
export async function revenuePerHeadWeekChange() {
  const now = new Date();
  const [thisWeek, lastWeek] = await Promise.all([
    metricsForRange(startOfWeek(), now),
    metricsForRange(startOfWeek(-1), startOfWeek()),
  ]);
  const rphThisWeek = thisWeek.admits > 0 ? thisWeek.sales / thisWeek.admits : 0;
  const rphLastWeek = lastWeek.admits > 0 ? lastWeek.sales / lastWeek.admits : 0;
  const pctChange = rphLastWeek > 0 ? ((rphThisWeek - rphLastWeek) / rphLastWeek) * 100 : null;
  return { rphThisWeek, rphLastWeek, pctChange };
}

export async function grossBoxOfficeToday() {
  const bookings = await prisma.booking.findMany({
    where: { status: "CONFIRMED", createdAt: { gte: startOfToday(), lt: new Date() } },
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

export async function concessionSalesToday() {
  const items = await prisma.bookingConcession.findMany({
    where: { booking: { status: "CONFIRMED", createdAt: { gte: startOfToday(), lt: new Date() } } },
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
