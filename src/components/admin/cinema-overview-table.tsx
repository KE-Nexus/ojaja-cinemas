"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/format";
import type { CinemaOverviewRow } from "@/lib/dashboard-metrics";

type Row = CinemaOverviewRow & { branchId: string; branchName: string };

export function CinemaOverviewTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => rows.filter((r) => r.branchName.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, query]
  );

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cinema..." className="pl-9" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-2 font-medium">Cinema</th>
              <th className="p-2 font-medium">Total Sales</th>
              <th className="p-2 font-medium">Ticket Sales</th>
              <th className="p-2 font-medium">Item Sales</th>
              <th className="p-2 font-medium">Order Count</th>
              <th className="p-2 font-medium">Ticket Count</th>
              <th className="p-2 font-medium">Online Sales</th>
              <th className="p-2 font-medium">Online Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.branchId} className="border-b border-border/50 last:border-0">
                <td className="p-2 font-medium">{r.branchName}</td>
                <td className="p-2 text-muted">{formatNaira(r.totalSales)}</td>
                <td className="p-2 text-muted">{formatNaira(r.ticketSales)}</td>
                <td className="p-2 text-muted">{formatNaira(r.itemSales)}</td>
                <td className="p-2 text-muted">{r.orderCount}</td>
                <td className="p-2 text-muted">{r.ticketCount}</td>
                <td className="p-2 text-muted">{formatNaira(r.onlineSales)}</td>
                <td className="p-2 text-muted">{r.onlineCount}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-4 text-center text-muted">
                  No cinemas match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
