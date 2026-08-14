"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { posCloseSessionAction, getSessionExpectedTotalsAction, type SessionExpectedTotals } from "@/actions/pos/tools";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/cn";

type Tender = "cash" | "card" | "transfer" | "voucher";
const TENDER_LABELS: Record<Tender, string> = { cash: "Cash", card: "Card", transfer: "Transfer", voucher: "Voucher" };

export function CloseSessionModal({ canCloseSelf, onClose }: { canCloseSelf: boolean; onClose: () => void }) {
  const [expected, setExpected] = useState<SessionExpectedTotals | null>(null);
  const [actual, setActual] = useState<Record<Tender, string>>({ cash: "", card: "", transfer: "", voucher: "" });
  const [adminStaffNumber, setAdminStaffNumber] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    getSessionExpectedTotalsAction().then((result) => {
      if (result.error) {
        setError(result.error);
        return;
      }
      setExpected(result.totals ?? null);
      if (result.totals) {
        setActual({
          cash: String(result.totals.cash),
          card: String(result.totals.card),
          transfer: String(result.totals.transfer),
          voucher: String(result.totals.voucher),
        });
      }
    });
  }, []);

  const totalExpected = expected ? expected.cash + expected.card + expected.transfer + expected.voucher : 0;

  function submit() {
    if (!canCloseSelf && (!adminStaffNumber.trim() || !adminPin.trim())) {
      setError("Ask a Supervisor to enter their user number and PIN to authorize this.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await posCloseSessionAction(
        {
          cash: Number(actual.cash) || 0,
          card: Number(actual.card) || 0,
          transfer: Number(actual.transfer) || 0,
          voucher: Number(actual.voucher) || 0,
        },
        canCloseSelf ? undefined : { staffNumber: adminStaffNumber.trim(), pin: adminPin.trim() }
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Session closed.");
      onClose();
      router.refresh();
    });
  }

  return (
    <PosModalShell title="Cashier Session" onClose={onClose} widthClass="max-w-xl">
      <p className="mb-4 text-center text-sm text-muted">
        Total Expected: <span className="font-semibold text-white">{formatNaira(totalExpected)}</span>
      </p>

      {expected === null && !error ? (
        <p className="py-8 text-center text-sm text-muted">Loading session totals...</p>
      ) : (
        <div className="space-y-3">
          {(Object.keys(TENDER_LABELS) as Tender[]).map((tender) => {
            const expectedAmount = expected?.[tender] ?? 0;
            const actualAmount = Number(actual[tender]) || 0;
            const variance = actualAmount - expectedAmount;
            return (
              <div key={tender} className="grid grid-cols-3 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div>
                  <p className="text-xs text-muted">Expected {TENDER_LABELS[tender]}</p>
                  <p className="text-sm font-semibold">{formatNaira(expectedAmount)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted">Actual {TENDER_LABELS[tender]}</p>
                  <input
                    value={actual[tender]}
                    onChange={(e) => setActual((prev) => ({ ...prev, [tender]: e.target.value }))}
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-brand-light"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted">{TENDER_LABELS[tender]} Variance</p>
                  <p className={cn("text-sm font-semibold", variance === 0 ? "text-muted" : variance > 0 ? "text-success" : "text-danger")}>
                    {variance > 0 ? "+" : ""}
                    {formatNaira(variance)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canCloseSelf && (
        <div className="mt-4 space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Supervisor Authorization Required</p>
          <input
            value={adminStaffNumber}
            onChange={(e) => setAdminStaffNumber(e.target.value)}
            placeholder="Supervisor user number"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
          />
          <input
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="Supervisor PIN"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
          />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        onClick={submit}
        disabled={isPending || expected === null}
        className="mt-4 w-full rounded-lg bg-danger py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Closing..." : "Close Session"}
      </button>
    </PosModalShell>
  );
}
