import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportDefinition } from "@/lib/admin-reports";
import { DownloadCsvButton } from "@/components/admin/download-csv-button";
import { formatNaira } from "@/lib/format";

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

type Table = { headers: string[]; rows: (string | number)[][] };

async function buildReport(key: string): Promise<{ summary?: string; table: Table } | null> {
  switch (key) {
    case "daily-operations": {
      const todayStart = startOfDay();
      const todayEnd = startOfDay(1);
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED", createdAt: { gte: todayStart, lt: todayEnd } },
        include: { showtime: { include: { movie: true, auditorium: { include: { branch: true } } } }, seats: true },
        orderBy: { createdAt: "desc" },
      });
      const revenue = bookings.reduce((s, b) => s + b.totalAmount, 0);
      return {
        summary: `${bookings.length} confirmed bookings today · ${formatNaira(revenue)} revenue`,
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
        where: { status: "CONFIRMED" },
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

    case "revenue-by-branch": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED" },
        include: { showtime: { include: { auditorium: { include: { branch: true } } } }, seats: true },
      });
      const byBranch = new Map<string, { name: string; revenue: number; tickets: number; bookings: number }>();
      for (const b of bookings) {
        const key = b.showtime.auditorium.branch.id;
        const entry = byBranch.get(key) ?? { name: b.showtime.auditorium.branch.name, revenue: 0, tickets: 0, bookings: 0 };
        entry.revenue += b.totalAmount;
        entry.tickets += b.seats.length;
        entry.bookings += 1;
        byBranch.set(key, entry);
      }
      const rows = Array.from(byBranch.values()).sort((a, b) => b.revenue - a.revenue);
      return {
        table: {
          headers: ["Branch", "Bookings", "Tickets Sold", "Revenue"],
          rows: rows.map((r) => [r.name, r.bookings, r.tickets, formatNaira(r.revenue)]),
        },
      };
    }

    case "bookings-by-genre": {
      const bookings = await prisma.booking.findMany({
        where: { status: "CONFIRMED" },
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
      const reviews = await prisma.review.findMany({ include: { movie: true } });
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

    case "promo-code-usage": {
      const [promoCodes, bookings] = await Promise.all([
        prisma.promoCode.findMany({ orderBy: { code: "asc" } }),
        prisma.booking.findMany({ where: { promoCodeId: { not: null } } }),
      ]);
      const discountByPromo = new Map<string, number>();
      for (const b of bookings) {
        if (!b.promoCodeId) continue;
        discountByPromo.set(b.promoCodeId, (discountByPromo.get(b.promoCodeId) ?? 0) + b.discount);
      }
      return {
        table: {
          headers: ["Code", "Type", "Value", "Used", "Limit", "Total Discount Given", "Status"],
          rows: promoCodes.map((p) => [
            p.code,
            p.discountType,
            p.discountType === "PERCENT" ? `${p.discountValue}%` : formatNaira(p.discountValue),
            p.usedCount,
            p.usageLimit ?? "Unlimited",
            formatNaira(discountByPromo.get(p.id) ?? 0),
            p.isActive ? "Active" : "Disabled",
          ]),
        },
      };
    }

    case "space-requests": {
      const requests = await prisma.spaceBookingRequest.findMany({ orderBy: { createdAt: "desc" } });
      const statusCounts = requests.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {});
      return {
        summary: Object.entries(statusCounts)
          .map(([status, count]) => `${count} ${status.toLowerCase()}`)
          .join(" · "),
        table: {
          headers: ["Name", "Event Type", "Event Date", "Headcount", "Status", "Submitted"],
          rows: requests.map((r) => [
            r.name,
            r.eventType,
            r.eventDate.toLocaleDateString("en-NG"),
            r.headcount,
            r.status,
            r.createdAt.toLocaleDateString("en-NG"),
          ]),
        },
      };
    }

    case "admin-actions-by-user": {
      const logs = await prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" } });
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

    default:
      return null;
  }
}

export default async function ReportDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await getSession();
  if (session?.role !== "MANAGER" && session?.role !== "ADMIN") redirect("/admin");

  const { key } = await params;
  const definition = getReportDefinition(key);
  if (!definition) notFound();

  const report = await buildReport(key);
  if (!report) notFound();

  return (
    <div>
      <Link href="/admin/reports" className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> All Reports
      </Link>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{definition.label}</h1>
          <p className="text-sm text-muted">{definition.description}</p>
        </div>
        <DownloadCsvButton filename={`${key}.csv`} headers={report.table.headers} rows={report.table.rows} />
      </div>

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
