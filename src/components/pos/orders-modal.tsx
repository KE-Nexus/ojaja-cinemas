"use client";

import { useEffect, useState } from "react";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { todaysOrdersAction, type PosOrder } from "@/actions/pos/tools";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/cn";

export function OrdersModal({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<PosOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    todaysOrdersAction().then((result) => {
      if (result.error) setError(result.error);
      else setOrders(result.orders ?? []);
    });
  }, []);

  return (
    <PosModalShell title="Today's Orders" onClose={onClose} widthClass="max-w-xl">
      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && orders === null && <p className="py-8 text-center text-sm text-muted">Loading...</p>}
      {orders && orders.length === 0 && <p className="py-8 text-center text-sm text-muted">No orders yet today.</p>}
      {orders && orders.length > 0 && (
        <div className="space-y-1.5">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-medium">{o.label}</p>
                <p className="text-xs text-muted">
                  {o.id} · {new Date(o.time).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    o.type === "Ticket" ? "bg-brand/20 text-brand-light" : "bg-accent-cyan/20 text-accent-cyan"
                  )}
                >
                  {o.type}
                </span>
                <span className="text-sm font-semibold">{formatNaira(o.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PosModalShell>
  );
}
