import Link from "next/link";
import { MapPin, Wallet, Ticket, ShoppingBag, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { SalesTrendChart } from "@/components/admin/sales-trend-chart";
import { CinemaOverviewTable } from "@/components/admin/cinema-overview-table";
import { CinemaSelectForm } from "@/components/admin/cinema-select-form";
import { getBranchScope } from "@/lib/branch-scope";
import {
  metricsForRange,
  circuitPeriodBreakdown,
  cinemaOverviewBreakdown,
  singleCinemaOverviewRow,
  revenuePerHeadWeekChange,
  grossBoxOfficeToday,
  concessionSalesToday,
  hourlySalesToday,
  dailySalesSeries,
  startOfToday,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "@/lib/dashboard-metrics";

const OVERVIEW_TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
] as const;

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
  searchParams: Promise<{ period?: string; from?: string; to?: string; cinema?: string }>;
}) {
  const { period, from, to, cinema } = await searchParams;
  const activeTab = period ?? "today";
  const overviewRange = resolveOverviewRange(period, from, to);

  const scope = await getBranchScope();
  // CircuitAdmin sees the whole circuit and can switch; everyone else is locked to their own cinema.
  const homeBranchId = scope.isCircuitAdmin ? undefined : (scope.branchId ?? undefined);

  const [
    todayTotals,
    circuit,
    rph,
    boxOfficeToday,
    concessionsToday,
    cinemaOverview,
    daySeries,
    weekSeries,
    monthSeries,
    branches,
  ] = await Promise.all([
    metricsForRange(startOfToday(), new Date(), homeBranchId),
    circuitPeriodBreakdown(homeBranchId),
    revenuePerHeadWeekChange(homeBranchId),
    grossBoxOfficeToday(homeBranchId),
    concessionSalesToday(homeBranchId),
    scope.isCircuitAdmin
      ? cinemaOverviewBreakdown(overviewRange.start, overviewRange.end)
      : homeBranchId
        ? singleCinemaOverviewRow(overviewRange.start, overviewRange.end, homeBranchId).then((row) => [row])
        : Promise.resolve([]),
    hourlySalesToday(homeBranchId),
    dailySalesSeries(7, homeBranchId),
    dailySalesSeries(30, homeBranchId),
    scope.isCircuitAdmin ? prisma.branch.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const selectedCinemaMetrics = scope.isCircuitAdmin
    ? cinema
      ? {
          daily: await metricsForRange(startOfToday(), new Date(), cinema),
          weekly: await metricsForRange(startOfWeek(), new Date(), cinema),
          monthly: await metricsForRange(startOfMonth(), new Date(), cinema),
          yearly: await metricsForRange(startOfYear(), new Date(), cinema),
        }
      : null
    : circuit; // for a branch-scoped viewer, the circuit breakdown IS their own cinema's breakdown

  const myBranchName = !scope.isCircuitAdmin
    ? (await prisma.branch.findUnique({ where: { id: scope.branchId ?? undefined } }))?.name
    : undefined;

  const buildOverviewHref = (params: Record<string, string>) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => (v ? sp.set(k, v) : sp.delete(k)));
    return `/admin?${sp.toString()}`;
  };

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* Data in Your Circuit */}
      <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted">
        {scope.isCircuitAdmin ? "Data in Your Circuit" : `Data at ${myBranchName ?? "Your Cinema"}`}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CircuitStatCard icon={<Wallet size={18} />} label="Sales" value={formatNaira(todayTotals.sales)} highlighted />
        <CircuitStatCard icon={<Ticket size={18} />} label="Ticket Sales" value={formatNaira(todayTotals.ticketSales)} />
        <CircuitStatCard icon={<ShoppingBag size={18} />} label="Item Sales" value={formatNaira(todayTotals.concessions)} />
        <CircuitStatCard icon={<Users size={18} />} label="Guest Admits" value={String(todayTotals.admits)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-1 font-semibold">Sales</h2>
          <SalesTrendChart day={daySeries} week={weekSeries} month={monthSeries} />
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Users size={16} className="text-brand-light" /> Guest Admits
            </h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Today</dt>
                <dd className="text-lg font-semibold">{circuit.daily.admits}</dd>
              </div>
              <div>
                <dt className="text-muted">This Week</dt>
                <dd className="text-lg font-semibold">{circuit.weekly.admits}</dd>
              </div>
              <div>
                <dt className="text-muted">This Month</dt>
                <dd className="text-lg font-semibold">{circuit.monthly.admits}</dd>
              </div>
              <div>
                <dt className="text-muted">This Year</dt>
                <dd className="text-lg font-semibold">{circuit.yearly.admits}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-2 font-semibold">Revenue Per Head (RPH)</h2>
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
              vs. last week
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">Gross Box Office Today</h2>
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
        <h2 className="font-semibold">Concession Sales</h2>
        <p className="mb-3 text-xs text-muted">Today&rsquo;s Sales</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-2 font-medium">No</th>
              <th className="p-2 font-medium">Item</th>
              <th className="p-2 font-medium">Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {concessionsToday.map((c, i) => (
              <tr key={c.name} className="border-b border-border/50 last:border-0">
                <td className="p-2 text-muted">{i + 1}</td>
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

      {/* Overview By Cinema */}
      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">{scope.isCircuitAdmin ? "Overview By Cinema" : "Overview"}</h2>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {OVERVIEW_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={buildOverviewHref(tab.key === "today" ? {} : { period: tab.key })}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {activeTab === "custom" && (
          <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="period" value="custom" />
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">From</label>
              <Input name="from" type="date" defaultValue={from ?? ""} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">To</label>
              <Input name="to" type="date" defaultValue={to ?? ""} />
            </div>
            <Button type="submit">Search</Button>
          </form>
        )}

        <p className="mb-2 text-xs text-muted">{OVERVIEW_TABS.find((t) => t.key === activeTab)?.label}</p>
        <CinemaOverviewTable rows={cinemaOverview} />
      </div>

      {/* Data Per Cinema */}
      {scope.isCircuitAdmin && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-3 font-semibold">Data Per Cinema</h2>
          <CinemaSelectForm branches={branches} selected={cinema} />

          {selectedCinemaMetrics && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="p-2 font-medium">Metric</th>
                    <th className="p-2 font-medium">Today</th>
                    <th className="p-2 font-medium">This Week</th>
                    <th className="p-2 font-medium">This Month</th>
                    <th className="p-2 font-medium">This Year</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-2 font-medium">Sales</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.daily.sales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.weekly.sales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.monthly.sales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.yearly.sales)}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-2 font-medium">Ticket Sales</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.daily.ticketSales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.weekly.ticketSales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.monthly.ticketSales)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.yearly.ticketSales)}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-2 font-medium">Concessions</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.daily.concessions)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.weekly.concessions)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.monthly.concessions)}</td>
                    <td className="p-2 text-muted">{formatNaira(selectedCinemaMetrics.yearly.concessions)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Guest Admits</td>
                    <td className="p-2 text-muted">{selectedCinemaMetrics.daily.admits}</td>
                    <td className="p-2 text-muted">{selectedCinemaMetrics.weekly.admits}</td>
                    <td className="p-2 text-muted">{selectedCinemaMetrics.monthly.admits}</td>
                    <td className="p-2 text-muted">{selectedCinemaMetrics.yearly.admits}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!scope.isCircuitAdmin && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={13} /> Showing data for {myBranchName ?? "your assigned cinema"} only.
        </p>
      )}

      <footer className="mt-8 border-t border-border pt-5 text-center text-xs text-muted">
        OJAJA Cinemas Office &middot; Circuit Management Dashboard &middot; &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function CircuitStatCard({
  icon,
  label,
  value,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-transform duration-300 hover:-translate-y-0.5",
        highlighted ? "border-brand bg-brand text-white" : "border-border bg-surface"
      )}
    >
      <div
        className={cn(
          "mb-2 flex h-9 w-9 items-center justify-center rounded-lg",
          highlighted ? "bg-white/20" : "bg-brand/15 text-brand-light"
        )}
      >
        {icon}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className={cn("text-sm", highlighted ? "text-white/80" : "text-muted")}>{label}</p>
    </div>
  );
}
