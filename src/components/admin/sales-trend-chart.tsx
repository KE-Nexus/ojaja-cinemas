"use client";

import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/cn";

type Series = { label: string; revenue: number }[];

export function SalesTrendChart({ day, week, month }: { day: Series; week: Series; month: Series }) {
  const [range, setRange] = useState<"day" | "week" | "month">("day");
  const data = range === "day" ? day : range === "week" ? week : month;

  return (
    <div>
      <div className="mb-4 flex gap-1.5">
        {(["day", "week", "month"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
              range === r ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-foreground"
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c22cc9" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#c22cc9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c1f3a" vertical={false} />
            <XAxis dataKey="label" stroke="#a693b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#a693b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v / 1000}k`} />
            <Tooltip
              contentStyle={{ background: "#150e1f", border: "1px solid #2c1f3a", borderRadius: 8, fontSize: 12 }}
              formatter={((value: number) => [`₦${Number(value).toLocaleString()}`, "Sales"]) as never}
            />
            <Area type="monotone" dataKey="revenue" stroke="#c22cc9" strokeWidth={2} fill="url(#salesFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
