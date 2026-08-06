"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PosModalShell } from "@/components/pos/pos-modal-shell";
import { posCloseSessionAction } from "@/actions/pos/tools";

export function CloseSessionModal({ canCloseSelf, onClose }: { canCloseSelf: boolean; onClose: () => void }) {
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [transfer, setTransfer] = useState("");
  const [voucher, setVoucher] = useState("");
  const [adminStaffNumber, setAdminStaffNumber] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!canCloseSelf && (!adminStaffNumber.trim() || !adminPin.trim())) {
      setError("Ask a Supervisor to enter their user number and PIN to authorize this.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await posCloseSessionAction(
        {
          cash: Number(cash) || 0,
          card: Number(card) || 0,
          transfer: Number(transfer) || 0,
          voucher: Number(voucher) || 0,
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
    <PosModalShell title="Close Session" onClose={onClose}>
      <p className="mb-4 text-sm text-muted">Count the till and enter what you actually have in each tender type.</p>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="Cash" value={cash} onChange={setCash} />
        <AmountField label="Card" value={card} onChange={setCard} />
        <AmountField label="Transfer" value={transfer} onChange={setTransfer} />
        <AmountField label="Voucher" value={voucher} onChange={setVoucher} />
      </div>

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
        disabled={isPending}
        className="mt-4 w-full rounded-lg bg-danger py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Closing..." : "Close Session"}
      </button>
    </PosModalShell>
  );
}

function AmountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        min={0}
        step="0.01"
        placeholder="0.00"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-muted focus:border-brand-light"
      />
    </div>
  );
}
