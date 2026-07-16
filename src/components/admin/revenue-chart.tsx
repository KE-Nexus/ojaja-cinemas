"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c22cc9" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#c22cc9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2c1f3a" vertical={false} />
          <XAxis dataKey="date" stroke="#a693b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#a693b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v / 1000}k`} />
          <Tooltip
            contentStyle={{ background: "#150e1f", border: "1px solid #2c1f3a", borderRadius: 8, fontSize: 12 }}
            formatter={((value: number) => [`₦${Number(value).toLocaleString()}`, "Revenue"]) as never}
          />
          <Area type="monotone" dataKey="revenue" stroke="#c22cc9" strokeWidth={2} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
