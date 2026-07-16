"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { ReportDefinition } from "@/lib/admin-reports";

export function ReportList({ reports }: { reports: ReportDefinition[] }) {
  const [query, setQuery] = useState("");
  const filtered = reports.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="relative mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports"
          className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-light"
        />
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {filtered.map((report, i) => (
          <div
            key={report.key}
            className={`flex items-center justify-between gap-4 px-5 py-4 ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="min-w-0">
              <p className="font-medium">{report.label}</p>
              <p className="truncate text-xs text-muted">{report.description}</p>
            </div>
            <Link
              href={`/admin/reports/${report.key}`}
              className="shrink-0 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:brightness-110"
            >
              Generate
            </Link>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted">No reports match &ldquo;{query}&rdquo;.</p>}
      </div>
    </div>
  );
}
