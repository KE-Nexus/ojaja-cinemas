"use client";

import { useState, useTransition } from "react";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { getUserSalesAction, type UserSalesSummary } from "@/actions/pos/tools";
import { formatNaira } from "@/lib/format";

export function UserSalesModal({ onClose }: { onClose: () => void }) {
  const [staffNumber, setStaffNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<UserSalesSummary | null>(null);
  const [authorizedBy, setAuthorizedBy] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function authorize() {
    if (!staffNumber.trim() || !pin.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await getUserSalesAction(staffNumber.trim(), pin.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setSummary(result.summary ?? null);
      setAuthorizedBy(result.authorizedBy ?? null);
    });
  }

  return (
    <PosModalShell title="Get Sales By User" onClose={onClose}>
      {!summary ? (
        <>
          <p className="mb-4 text-sm text-muted">Today&rsquo;s sales for your own account — a Supervisor or Circuit Admin must authorize with their PIN.</p>
          <div className="space-y-3">
            <input
              value={staffNumber}
              onChange={(e) => setStaffNumber(e.target.value)}
              placeholder="Supervisor user number"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && authorize()}
              type="password"
              inputMode="numeric"
              placeholder="Supervisor PIN"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
            />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <button
            onClick={authorize}
            disabled={isPending || !staffNumber.trim() || !pin.trim()}
            className="mt-4 w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-40"
          >
            {isPending ? "Checking..." : "Authorize"}
          </button>
        </>
      ) : (
        <div>
          {authorizedBy && <p className="mb-3 text-xs text-muted">Authorized by {authorizedBy}</p>}
          <div className="space-y-2.5">
            <Row label="Orders" value={String(summary.orders)} />
            <Row label="Ticket Revenue" value={formatNaira(summary.ticketRevenue)} />
            <Row label="Concession Revenue" value={formatNaira(summary.concessionRevenue)} />
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2.5">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold text-brand-light">{formatNaira(summary.total)}</span>
            </div>
          </div>
        </div>
      )}
    </PosModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
