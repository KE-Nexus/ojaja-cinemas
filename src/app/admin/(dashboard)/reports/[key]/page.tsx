import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { prisma } from "@/lib/prisma";
import { getReportDefinition } from "@/lib/admin-reports";
import { DownloadCsvButton } from "@/components/admin/download-csv-button";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

type DateRange = { from?: Date; to?: Date };
type Filters = DateRange & { branchId?: string };

function createdAtFilter({ from, to }: DateRange) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) };
}

/** Booking-based reports reach the branch through showtime -> auditorium. */
function bookingBranchWhere(branchId?: string) {
  return branchId ? { showtime: { auditorium: { branchId } } } : {};
}

/** Showtime-based reports reach the branch through auditorium directly. */
function showtimeBranchWhere(branchId?: string) {
  return branchId ? { auditorium: { branchId } } : {};
}

type Table = { headers: string[]; rows: (string | number)[][] };

async function buildReport(key: string, filters: Filters): Promise<{ summary?: string; table: Table } | null> {
  const createdAt = createdAtFilter(filters);
  const { branchId } = filters;

  switch (key) {
    case "daily-operations": {
      const todayStart = filters.from ?? startOfDay();
      const todayEnd = filters.to ?? startOfDay(1);
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", createdAt: { gte: todayStart, lt: todayEnd }, ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true, auditorium: { include: { branch: true } } } }, seats: true },
        orderBy: { createdAt: "desc" },
      });
      const revenue = bookings.reduce((s, b) => s + b.totalAmount, 0);
      return {
        summary: `${bookings.length} confirmed bookings · ${formatNaira(revenue)} revenue`,
        table: {
          headers: ["Reference", "Movie", "Branch", "Seats", "Amount", "Time"],
          rows: bookings.map((b) => [
            b.reference,
            b.showtime.movie.title,
            b.showtime.auditorium.branch.name,
            b.seats.length,
            formatNaira(b.totalAmount),
            b.createdAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
          ]),
        },
      };
    }

    case "box-office-performance": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true },
      });
      const byMovie = new Map<string, { title: string; revenue: number; tickets: number; bookings: number }>();
      for (const b of bookings) {
        const key = b.showtime.movie.id;
        const entry = byMovie.get(key) ?? { title: b.showtime.movie.title, revenue: 0, tickets: 0, bookings: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        entry.bookings += 1;
        byMovie.set(key, entry);
      }
      const rows = Array.from(byMovie.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        summary: `${rows.length} movies with sales · ${formatNaira(rows.reduce((s, r) => s + r.revenue, 0))} total revenue`,
        table: {
          headers: ["Movie", "Bookings", "Tickets Sold", "Revenue"],
          rows: rows.map((r) => [r.title, r.bookings, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "bookings-by-genre": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true },
      });
      const byGenre = new Map<string, { revenue: number; tickets: number; bookings: number }>();
      for (const b of bookings) {
        const genre = b.showtime.movie.genres.split(",")[0]?.trim() || "Unclassified";
        const entry = byGenre.get(genre) ?? { revenue: 0, tickets: 0, bookings: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        entry.bookings += 1;
        byGenre.set(genre, entry);
      }
      const rows = Array.from(byGenre.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
      return {
        table: {
          headers: ["Genre", "Bookings", "Tickets Sold", "Revenue"],
          rows: rows.map(([genre, r]) => [genre, r.bookings, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "cinema-reviews": {
      const reviews = await prisma.review.findMany({ where: createdAt ? { createdAt } : undefined, include: { movie: true } });
      const byMovie = new Map<string, { title: string; approved: number; pending: number; rejected: number; ratingSum: number }>();
      for (const r of reviews) {
        const entry = byMovie.get(r.movieId) ?? { title: r.movie.title, approved: 0, pending: 0, rejected: 0, ratingSum: 0 };
        if (r.status === "APPROVED") {
          entry.approved += 1;
          entry.ratingSum += r.rating;
        } else if (r.status === "PENDING") entry.pending += 1;
        else entry.rejected += 1;
        byMovie.set(r.movieId, entry);
      }
      const rows = Array.from(byMovie.values()).sort((a, b) => b.approved - a.approved);
      return {
        table: {
          headers: ["Movie", "Approved", "Pending", "Rejected", "Avg Rating"],
          rows: rows.map((r) => [r.title, r.approved, r.pending, r.rejected, r.approved > 0 ? (r.ratingSum / r.approved).toFixed(1) : "—"]),
        },
      };
    }

    case "admin-actions-by-user": {
      const logs = await prisma.auditLog.findMany({
        where: createdAt ? { createdAt } : undefined,
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      });
      const byActor = new Map<string, { name: string; role: string; count: number; lastAction: Date }>();
      for (const log of logs) {
        const key = log.actorUserId ?? "system";
        const entry = byActor.get(key) ?? {
          name: log.actor?.name ?? "System",
          role: log.actor?.role ?? "—",
          count: 0,
          lastAction: log.createdAt,
        };
        entry.count += 1;
        if (log.createdAt > entry.lastAction) entry.lastAction = log.createdAt;
        byActor.set(key, entry);
      }
      const rows = Array.from(byActor.values()).sort((a, b) => b.count - a.count);
      return {
        table: {
          headers: ["Staff Member", "Role", "Actions", "Last Action"],
          rows: rows.map((r) => [r.name, r.role, r.count, r.lastAction.toLocaleString("en-NG")]),
        },
      };
    }

    case "cashier-session-reconciliation": {
      const sessions = await prisma.staffSession.findMany({
        where: { status: "CLOSED", ...(createdAt ? { closedAt: createdAt } : {}), ...(branchId ? { branchId } : {}) },
        include: { staff: true, branch: true },
        orderBy: { closedAt: "desc" },
      });
      return {
        summary: `${sessions.length} closed session${sessions.length === 1 ? "" : "s"} reconciled`,
        table: {
          headers: ["Staff", "Branch", "Opened", "Closed", "Cash", "Card", "Transfer", "Voucher", "Declared Total"],
          rows: sessions.map((s) => {
            const total = (s.actualCash ?? 0) + (s.actualCard ?? 0) + (s.actualTransfer ?? 0) + (s.actualVoucher ?? 0);
            return [
              s.staff.name,
              s.branch.name,
              s.openedAt.toLocaleString("en-NG"),
              s.closedAt?.toLocaleString("en-NG") ?? "—",
              formatNaira(s.actualCash ?? 0),
              formatNaira(s.actualCard ?? 0),
              formatNaira(s.actualTransfer ?? 0),
              formatNaira(s.actualVoucher ?? 0),
              formatNaira(total),
            ];
          }),
        },
      };
    }

    case "cashup-report": {
      const sessions = await prisma.staffSession.findMany({
        where: { status: "CLOSED", ...(createdAt ? { closedAt: createdAt } : {}), ...(branchId ? { branchId } : {}) },
        include: { branch: true },
      });
      const byDayBranch = new Map<string, { day: string; branch: string; cash: number; card: number; transfer: number; voucher: number }>();
      for (const s of sessions) {
        const day = (s.closedAt ?? s.openedAt).toLocaleDateString("en-NG");
        const key = `${day}__${s.branch.id}`;
        const entry = byDayBranch.get(key) ?? { day, branch: s.branch.name, cash: 0, card: 0, transfer: 0, voucher: 0 };
        entry.cash += s.actualCash ?? 0;
        entry.card += s.actualCard ?? 0;
        entry.transfer += s.actualTransfer ?? 0;
        entry.voucher += s.actualVoucher ?? 0;
        byDayBranch.set(key, entry);
      }
      const rows = Array.from(byDayBranch.values()).sort((a, b) => b.day.localeCompare(a.day));
      return {
        table: {
          headers: ["Date", "Branch", "Cash", "Card", "Transfer", "Voucher", "Total"],
          rows: rows.map((r) => [
            r.day,
            r.branch,
            formatNaira(r.cash),
            formatNaira(r.card),
            formatNaira(r.transfer),
            formatNaira(r.voucher),
            formatNaira(r.cash + r.card + r.transfer + r.voucher),
          ]),
        },
      };
    }

    case "distributor-by-film": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true },
      });
      const byDistributor = new Map<string, { revenue: number; tickets: number; bookings: number }>();
      for (const b of bookings) {
        const key = b.showtime.movie.distributor?.trim() || "Independent / Unlisted";
        const entry = byDistributor.get(key) ?? { revenue: 0, tickets: 0, bookings: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        entry.bookings += 1;
        byDistributor.set(key, entry);
      }
      const rows = Array.from(byDistributor.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
      return {
        table: {
          headers: ["Distributor", "Bookings", "Tickets Sold", "Revenue"],
          rows: rows.map(([name, r]) => [name, r.bookings, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "film-by-screen": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true, auditorium: { include: { branch: true } } } }, seats: true },
      });
      const byFilmScreen = new Map<string, { movie: string; branch: string; auditorium: string; revenue: number; tickets: number; sessions: Set<string> }>();
      for (const b of bookings) {
        const key = `${b.showtime.movieId}__${b.showtime.auditoriumId}`;
        const entry = byFilmScreen.get(key) ?? {
          movie: b.showtime.movie.title,
          branch: b.showtime.auditorium.branch.name,
          auditorium: b.showtime.auditorium.name,
          revenue: 0,
          tickets: 0,
          sessions: new Set<string>(),
        };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        entry.sessions.add(b.showtimeId);
        byFilmScreen.set(key, entry);
      }
      const rows = Array.from(byFilmScreen.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        table: {
          headers: ["Film", "Branch", "Screen", "Sessions", "Tickets Sold", "Revenue"],
          rows: rows.map((r) => [r.movie, r.branch, r.auditorium, r.sessions.size, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "film-hire-report": {
      const contracts = await prisma.filmContract.findMany({
        where: { ...(createdAt ? { createdAt } : {}), ...(branchId ? { branchId } : {}) },
        include: { movie: true, branch: true },
        orderBy: { contractStartDate: "desc" },
      });
      return {
        summary: `${contracts.length} active film contract${contracts.length === 1 ? "" : "s"}`,
        table: {
          headers: ["Film", "Branch", "Contract Start", "Classification", "Distributor"],
          rows: contracts.map((c) => [
            c.movie.title,
            c.branch.name,
            c.contractStartDate.toLocaleDateString("en-NG"),
            c.movie.classification,
            c.movie.distributor ?? "—",
          ]),
        },
      };
    }

    case "gbo-by-screen-type": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { auditorium: true } }, seats: true },
      });
      const byScreenType = new Map<string, { revenue: number; tickets: number }>();
      for (const b of bookings) {
        const key = b.showtime.auditorium.screenType;
        const entry = byScreenType.get(key) ?? { revenue: 0, tickets: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        byScreenType.set(key, entry);
      }
      const rows = Array.from(byScreenType.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
      return {
        table: {
          headers: ["Screen Type", "Tickets Sold", "Gross Box Office"],
          rows: rows.map(([type, r]) => [type, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "gbo-by-tickets": {
      const bookingSeats = await prisma.bookingSeat.findMany({
        where: { booking: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) } },
        include: { seat: true },
      });
      const byCategory = new Map<string, { revenue: number; tickets: number }>();
      for (const s of bookingSeats) {
        const entry = byCategory.get(s.seat.category) ?? { revenue: 0, tickets: 0 };
        entry.revenue += s.priceAtBooking;
        entry.tickets += 1;
        byCategory.set(s.seat.category, entry);
      }
      const rows = Array.from(byCategory.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
      return {
        table: {
          headers: ["Ticket Category", "Tickets Sold", "Gross Box Office"],
          rows: rows.map(([cat, r]) => [cat, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "gbo-film-reports": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true },
      });
      const byMovie = new Map<string, { title: string; revenue: number; tickets: number }>();
      for (const b of bookings) {
        const key = b.showtime.movie.id;
        const entry = byMovie.get(key) ?? { title: b.showtime.movie.title, revenue: 0, tickets: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        byMovie.set(key, entry);
      }
      const rows = Array.from(byMovie.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        summary: `${formatNaira(rows.reduce((s, r) => s + r.revenue, 0))} total GBO`,
        table: {
          headers: ["Film", "Tickets Sold", "Gross Box Office", "Avg Ticket Price"],
          rows: rows.map((r) => [r.title, r.tickets, formatNaira(r.revenue), formatNaira(r.tickets > 0 ? r.revenue / r.tickets : 0)]),
        },
      };
    }

    case "item-details-sales-report": {
      const lines = await prisma.bookingConcession.findMany({
        where: { booking: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) } },
        include: { booking: true, posItem: true },
        orderBy: { booking: { createdAt: "desc" } },
      });
      return {
        table: {
          headers: ["Booking Ref", "Item", "Quantity", "Unit Price", "Line Total", "Date"],
          rows: lines.map((l) => [
            l.booking.reference,
            l.posItem.name,
            l.quantity,
            formatNaira(l.priceAtBooking),
            formatNaira(l.priceAtBooking * l.quantity),
            l.booking.createdAt.toLocaleString("en-NG"),
          ]),
        },
      };
    }

    case "item-sales-report": {
      const lines = await prisma.bookingConcession.findMany({
        where: { booking: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) } },
        include: { posItem: true },
      });
      const byItem = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const l of lines) {
        const entry = byItem.get(l.posItemId) ?? { name: l.posItem.name, quantity: 0, revenue: 0 };
        entry.quantity += l.quantity;
        entry.revenue += l.priceAtBooking * l.quantity;
        byItem.set(l.posItemId, entry);
      }
      const rows = Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        summary: `${formatNaira(rows.reduce((s, r) => s + r.revenue, 0))} total item sales`,
        table: {
          headers: ["Item", "Quantity Sold", "Revenue"],
          rows: rows.map((r) => [r.name, r.quantity, formatNaira(r.revenue)]),
        },
      };
    }

    case "marketing-report": {
      const [promoCodes, promoBookings, reviews] = await Promise.all([
        prisma.promoCode.findMany({ orderBy: { code: "asc" } }),
        prisma.booking.findMany({ where: { promoCodeId: { not: null }, ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) } }),
        prisma.review.count({ where: createdAt ? { createdAt } : undefined }),
      ]);
      const discountByPromo = new Map<string, { discount: number; uses: number }>();
      for (const b of promoBookings) {
        if (!b.promoCodeId) continue;
        const entry = discountByPromo.get(b.promoCodeId) ?? { discount: 0, uses: 0 };
        entry.discount += b.discount;
        entry.uses += 1;
        discountByPromo.set(b.promoCodeId, entry);
      }
      return {
        summary: `${reviews} review${reviews === 1 ? "" : "s"} submitted in this period`,
        table: {
          headers: ["Promo Code", "Type", "Value", "Redemptions", "Total Discount Given", "Status"],
          rows: promoCodes.map((p) => {
            const stats = discountByPromo.get(p.id) ?? { discount: 0, uses: 0 };
            return [
              p.code,
              p.discountType,
              p.discountType === "PERCENT" ? `${p.discountValue}%` : formatNaira(p.discountValue),
              stats.uses,
              formatNaira(stats.discount),
              p.isActive ? "Active" : "Disabled",
            ];
          }),
        },
      };
    }

    case "nomba-connect-transaction-report":
    case "nomba-mobile-pos-transaction-report":
    case "nomba-pos-auto-reconciliation-report":
    case "nomba-web-transaction-report": {
      return {
        summary: "Not connected — no Nomba payment terminal integration is configured for this deployment.",
        table: {
          headers: ["Transaction Ref", "Terminal", "Amount", "Status", "Date"],
          rows: [],
        },
      };
    }

    case "online-item-sales-report": {
      const lines = await prisma.bookingConcession.findMany({
        where: { booking: { status: "CONFIRMED", processedById: null, ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) } },
        include: { posItem: true },
      });
      const byItem = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const l of lines) {
        const entry = byItem.get(l.posItemId) ?? { name: l.posItem.name, quantity: 0, revenue: 0 };
        entry.quantity += l.quantity;
        entry.revenue += l.priceAtBooking * l.quantity;
        byItem.set(l.posItemId, entry);
      }
      const rows = Array.from(byItem.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        table: {
          headers: ["Item", "Quantity Sold", "Revenue"],
          rows: rows.map((r) => [r.name, r.quantity, formatNaira(r.revenue)]),
        },
      };
    }

    case "online-orders": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", processedById: null, ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true, user: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        summary: `${bookings.length} online order${bookings.length === 1 ? "" : "s"} · ${formatNaira(bookings.reduce((s, b) => s + b.totalAmount, 0))} revenue`,
        table: {
          headers: ["Reference", "Customer", "Movie", "Seats", "Amount", "Date"],
          rows: bookings.map((b) => [
            b.reference,
            b.user?.name ?? b.guestName ?? "Guest",
            b.showtime.movie.title,
            b.seats.length,
            formatNaira(b.totalAmount),
            b.createdAt.toLocaleString("en-NG"),
          ]),
        },
      };
    }

    case "operations-report": {
      const branches = await prisma.branch.findMany({ where: branchId ? { id: branchId } : undefined, include: { auditoriums: true } });
      const todayStart = startOfDay();
      const todayEnd = startOfDay(1);
      const rows = await Promise.all(
        branches.map(async (b) => {
          const auditoriumIds = b.auditoriums.map((a) => a.id);
          const [showtimesToday, bookingsToday] = await Promise.all([
            prisma.showtime.count({ where: { auditoriumId: { in: auditoriumIds }, startTime: { gte: todayStart, lt: todayEnd } } }),
            prisma.booking.findMany({
              where: { status: "CONFIRMED", showtime: { auditoriumId: { in: auditoriumIds } }, createdAt: { gte: todayStart, lt: todayEnd } },
              include: { seats: true },
            }),
          ]);
          return [
            b.name,
            b.auditoriums.length,
            showtimesToday,
            bookingsToday.length,
            bookingsToday.reduce((s, x) => s + x.seats.length, 0),
            formatNaira(bookingsToday.reduce((s, x) => s + x.totalAmount, 0)),
          ];
        })
      );
      return {
        table: {
          headers: ["Cinema", "Screens", "Sessions Today", "Bookings Today", "Tickets Today", "Revenue Today"],
          rows,
        },
      };
    }

    case "orders-by-source-and-channel": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { payments: true },
      });
      const byChannel = new Map<string, { revenue: number; count: number }>();
      for (const b of bookings) {
        const source = b.processedById ? "Box Office" : "Online";
        const method = b.payments.find((p) => p.status === "SUCCESS")?.method ?? "Unknown";
        const key = `${source}__${method}`;
        const entry = byChannel.get(key) ?? { revenue: 0, count: 0 };
        entry.revenue += b.totalAmount;
        entry.count += 1;
        byChannel.set(key, entry);
      }
      const rows = Array.from(byChannel.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
      return {
        table: {
          headers: ["Source", "Payment Method", "Orders", "Revenue"],
          rows: rows.map(([key, r]) => {
            const [source, method] = key.split("__");
            return [source, method, r.count, formatNaira(r.revenue)];
          }),
        },
      };
    }

    case "performance-by-film": {
      const showtimes = await prisma.showtime.findMany({
        where: { ...(createdAt ? { startTime: createdAt } : {}), ...showtimeBranchWhere(branchId) },
        include: { movie: true, auditorium: true, bookings: { where: { status: "CONFIRMED" }, include: { seats: true } } },
      });
      const byMovie = new Map<string, { title: string; capacity: number; sold: number; revenue: number }>();
      for (const st of showtimes) {
        const entry = byMovie.get(st.movieId) ?? { title: st.movie.title, capacity: 0, sold: 0, revenue: 0 };
        entry.capacity += st.auditorium.rows * st.auditorium.seatsPerRow;
        for (const b of st.bookings) {
          entry.sold += b.seats.length;
          entry.revenue += b.totalAmount;
        }
        byMovie.set(st.movieId, entry);
      }
      const rows = Array.from(byMovie.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        table: {
          headers: ["Film", "Seats Sold", "Capacity", "Occupancy", "Revenue"],
          rows: rows.map((r) => [
            r.title,
            r.sold,
            r.capacity,
            r.capacity > 0 ? `${((r.sold / r.capacity) * 100).toFixed(1)}%` : "—",
            formatNaira(r.revenue),
          ]),
        },
      };
    }

    case "performance-by-showtime": {
      const showtimes = await prisma.showtime.findMany({
        where: { ...(createdAt ? { startTime: createdAt } : { startTime: { gte: startOfDay(-7) } }), ...showtimeBranchWhere(branchId) },
        include: { movie: true, auditorium: { include: { branch: true } }, bookings: { where: { status: "CONFIRMED" }, include: { seats: true } } },
        orderBy: { startTime: "desc" },
        take: 200,
      });
      return {
        table: {
          headers: ["Film", "Branch", "Screen", "Start Time", "Seats Sold", "Capacity", "Occupancy", "Revenue"],
          rows: showtimes.map((st) => {
            const capacity = st.auditorium.rows * st.auditorium.seatsPerRow;
            const sold = st.bookings.reduce((s, b) => s + b.seats.length, 0);
            const revenue = st.bookings.reduce((s, b) => s + b.totalAmount, 0);
            return [
              st.movie.title,
              st.auditorium.branch.name,
              st.auditorium.name,
              st.startTime.toLocaleString("en-NG"),
              sold,
              capacity,
              capacity > 0 ? `${((sold / capacity) * 100).toFixed(1)}%` : "—",
              formatNaira(revenue),
            ];
          }),
        },
      };
    }

    case "performance-report": {
      const branches = await prisma.branch.findMany({ where: branchId ? { id: branchId } : undefined, include: { auditoriums: true } });
      const rows = await Promise.all(
        branches.map(async (b) => {
          const auditoriumIds = b.auditoriums.map((a) => a.id);
          const capacity = b.auditoriums.reduce((s, a) => s + a.rows * a.seatsPerRow, 0);
          const bookings = await prisma.booking.findMany({
            where: { status: "CONFIRMED", showtime: { auditoriumId: { in: auditoriumIds } }, ...(createdAt ? { createdAt } : {}) },
            include: { seats: true },
          });
          const admits = bookings.reduce((s, x) => s + x.seats.length, 0);
          const revenue = bookings.reduce((s, x) => s + x.totalAmount, 0);
          return [b.name, bookings.length, admits, capacity > 0 ? `${((admits / capacity) * 100).toFixed(1)}%` : "—", formatNaira(revenue)];
        })
      );
      return {
        table: {
          headers: ["Cinema", "Bookings", "Admits", "Occupancy", "Revenue"],
          rows,
        },
      };
    }

    case "refunds-report": {
      const bookings = await prisma.booking.findMany({
        where: { status: "REFUNDED", ...(createdAt ? { updatedAt: createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, processedBy: true, seats: true },
        orderBy: { updatedAt: "desc" },
      });
      return {
        summary: `${bookings.length} refund${bookings.length === 1 ? "" : "s"} · ${formatNaira(bookings.reduce((s, b) => s + b.totalAmount, 0))} refunded`,
        table: {
          headers: ["Reference", "Movie", "Seats", "Amount", "Processed By", "Date"],
          rows: bookings.map((b) => [
            b.reference,
            b.showtime.movie.title,
            b.seats.length,
            formatNaira(b.totalAmount),
            b.processedBy?.name ?? "Customer",
            b.updatedAt.toLocaleString("en-NG"),
          ]),
        },
      };
    }

    case "session-reconciliation": {
      const sessions = await prisma.staffSession.findMany({
        where: { ...(createdAt ? { openedAt: createdAt } : {}), ...(branchId ? { branchId } : {}) },
        include: { staff: true, branch: true },
        orderBy: { openedAt: "desc" },
      });
      return {
        table: {
          headers: ["Staff", "Branch", "Status", "Opened", "Closed"],
          rows: sessions.map((s) => [s.staff.name, s.branch.name, s.status, s.openedAt.toLocaleString("en-NG"), s.closedAt?.toLocaleString("en-NG") ?? "—"]),
        },
      };
    }

    case "settlement-report": {
      const payments = await prisma.payment.findMany({
        where: { status: "SUCCESS", ...(createdAt ? { createdAt } : {}), booking: bookingBranchWhere(branchId) },
      });
      const byDayMethod = new Map<string, { day: string; method: string; amount: number; count: number }>();
      for (const p of payments) {
        const day = p.createdAt.toLocaleDateString("en-NG");
        const key = `${day}__${p.method}`;
        const entry = byDayMethod.get(key) ?? { day, method: p.method, amount: 0, count: 0 };
        entry.amount += p.amount;
        entry.count += 1;
        byDayMethod.set(key, entry);
      }
      const rows = Array.from(byDayMethod.values()).sort((a, b) => b.day.localeCompare(a.day));
      return {
        summary: `${formatNaira(payments.reduce((s, p) => s + p.amount, 0))} settled`,
        table: {
          headers: ["Date", "Method", "Transactions", "Amount Settled"],
          rows: rows.map((r) => [r.day, r.method, r.count, formatNaira(r.amount)]),
        },
      };
    }

    case "showtime-booking-report": {
      const showtimes = await prisma.showtime.findMany({
        where: { ...(createdAt ? { startTime: createdAt } : { startTime: { gte: startOfDay(-7) } }), ...showtimeBranchWhere(branchId) },
        include: { movie: true, auditorium: { include: { branch: true } }, bookings: { where: { status: "CONFIRMED" }, include: { seats: true } } },
        orderBy: { startTime: "desc" },
        take: 200,
      });
      return {
        table: {
          headers: ["Film", "Branch", "Screen", "Start Time", "Bookings", "Seats Booked"],
          rows: showtimes.map((st) => [
            st.movie.title,
            st.auditorium.branch.name,
            st.auditorium.name,
            st.startTime.toLocaleString("en-NG"),
            st.bookings.length,
            st.bookings.reduce((s, b) => s + b.seats.length, 0),
          ]),
        },
      };
    }

    case "showtimes-schedule": {
      const showtimes = await prisma.showtime.findMany({
        where: { ...(createdAt ? { startTime: createdAt } : { startTime: { gte: startOfDay() } }), ...showtimeBranchWhere(branchId) },
        include: { movie: true, auditorium: { include: { branch: true } } },
        orderBy: { startTime: "asc" },
        take: 300,
      });
      return {
        table: {
          headers: ["Film", "Branch", "Screen", "Start Time", "Format", "Language", "Status"],
          rows: showtimes.map((st) => [
            st.movie.title,
            st.auditorium.branch.name,
            st.auditorium.name,
            st.startTime.toLocaleString("en-NG"),
            st.format,
            st.language,
            st.status,
          ]),
        },
      };
    }

    case "staff-performance": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", processedById: { not: null }, ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { processedBy: true, seats: true },
      });
      const byStaff = new Map<string, { name: string; role: string; bookings: number; tickets: number; revenue: number }>();
      for (const b of bookings) {
        if (!b.processedById || !b.processedBy) continue;
        const entry = byStaff.get(b.processedById) ?? { name: b.processedBy.name, role: b.processedBy.role, bookings: 0, tickets: 0, revenue: 0 };
        entry.bookings += 1;
        entry.tickets += b.seats.length;
        entry.revenue += b.totalAmount;
        byStaff.set(b.processedById, entry);
      }
      const rows = Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        table: {
          headers: ["Staff Member", "Role", "Bookings", "Tickets Sold", "Revenue Handled"],
          rows: rows.map((r) => [r.name, r.role, r.bookings, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "swapped-ticket-report": {
      const logs = await prisma.auditLog.findMany({
        where: { entityType: "Booking", metadata: { contains: "seat-swap" }, ...(createdAt ? { createdAt } : {}) },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      });
      return {
        summary: `${logs.length} seat swap${logs.length === 1 ? "" : "s"}`,
        table: {
          headers: ["Booking Ref", "Swapped By", "Role", "Date"],
          rows: logs.map((l) => [l.entityId, l.actor?.name ?? "System", l.actor?.role ?? "—", l.createdAt.toLocaleString("en-NG")]),
        },
      };
    }

    case "ticket-sales-report": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", ...(createdAt ? { createdAt } : {}), ...bookingBranchWhere(branchId) },
        include: { showtime: { include: { movie: true } }, seats: true },
      });
      const byMovie = new Map<string, { title: string; tickets: number; revenue: number }>();
      for (const b of bookings) {
        const entry = byMovie.get(b.showtime.movieId) ?? { title: b.showtime.movie.title, tickets: 0, revenue: 0 };
        entry.tickets += b.seats.length;
        entry.revenue += b.seats.reduce((s, seat) => s + seat.priceAtBooking, 0);
        byMovie.set(b.showtime.movieId, entry);
      }
      const rows = Array.from(byMovie.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        summary: `${formatNaira(rows.reduce((s, r) => s + r.revenue, 0))} ticket revenue (excludes concessions)`,
        table: {
          headers: ["Film", "Tickets Sold", "Ticket Revenue"],
          rows: rows.map((r) => [r.title, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "transactions-by-user": {
      const payments = await prisma.payment.findMany({
        where: { status: "SUCCESS", ...(createdAt ? { createdAt } : {}), booking: bookingBranchWhere(branchId) },
        include: { booking: { include: { user: true } } },
      });
      const byUser = new Map<string, { name: string; count: number; amount: number }>();
      for (const p of payments) {
        const identity = p.booking.userId ?? p.booking.guestEmail ?? p.booking.guestName ?? "Unknown";
        const name = p.booking.user?.name ?? p.booking.guestName ?? "Guest";
        const entry = byUser.get(identity) ?? { name, count: 0, amount: 0 };
        entry.count += 1;
        entry.amount += p.amount;
        byUser.set(identity, entry);
      }
      const rows = Array.from(byUser.values()).sort((a, b) => b.amount - a.amount);
      return {
        table: {
          headers: ["Customer", "Transactions", "Total Paid"],
          rows: rows.map((r) => [r.name, r.count, formatNaira(r.amount)]),
        },
      };
    }

    default:
      return null;
  }
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ from?: string; to?: string; branch?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN" && session?.role !== "AUDITOR") redirect("/admin");
  if (!(await hasClaim(session.role, "CAN_VIEW_REPORTS"))) redirect("/admin");

  const { key } = await params;
  const definition = getReportDefinition(key);
  if (!definition) notFound();

  const { from: fromParam, to: toParam, branch: branchParam } = await searchParams;
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  // "to" is inclusive of the whole day, so the range filter uses the start of the next day.
  const to = toParam ? new Date(new Date(`${toParam}T00:00:00`).getTime() + 24 * 60 * 60 * 1000) : undefined;

  const scope = await getBranchScope();
  const branchId = resolveScopedBranchId(scope, branchParam);

  const [branches, report] = await Promise.all([
    scope.isCircuitAdmin
      ? prisma.branch.findMany({ orderBy: { name: "asc" } })
      : prisma.branch.findMany({ where: { id: scope.branchId ?? undefined } }),
    buildReport(key, { from, to, branchId }),
  ]);
  if (!report) notFound();

  return (
    <div>
      <Link href="/admin/reports" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> All Reports
      </Link>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{definition.label} - Set Report Parameters</h1>
          <p className="text-sm text-muted">{definition.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/reports">
            <Button type="button" variant="outline" size="md">
              Cancel
            </Button>
          </Link>
          <DownloadCsvButton filename={`${key}.csv`} headers={report.table.headers} rows={report.table.rows} />
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div>
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={fromParam ?? ""} />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={toParam ?? ""} />
        </div>
        {scope.isCircuitAdmin ? (
          <div>
            <Label htmlFor="branch">Site</Label>
            <Select id="branch" name="branch" defaultValue={branchId ?? ""} className="min-w-[180px]">
              <option value="">All Cinemas</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label>Site</Label>
            <p className="rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
              {branches[0]?.name ?? "No cinema assigned"}
            </p>
          </div>
        )}
        <Button type="submit" size="md">
          Run Report
        </Button>
        {(fromParam || toParam || branchParam) && (
          <Link href={`/admin/reports/${key}`} className="pb-2.5 text-sm text-muted hover:text-brand-light">
            Clear
          </Link>
        )}
      </form>

      {report.summary && <p className="mb-4 text-sm font-medium text-brand-light">{report.summary}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              {report.table.headers.map((h) => (
                <th key={h} className="whitespace-nowrap p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.table.rows.map((row, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="whitespace-nowrap p-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {report.table.rows.length === 0 && (
              <tr>
                <td colSpan={report.table.headers.length} className="p-6 text-center text-muted">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
