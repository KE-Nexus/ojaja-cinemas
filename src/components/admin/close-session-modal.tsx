"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X, Lock } from "lucide-react";
import { toast } from "sonner";
import { closeStaffSessionAction, type FormState } from "@/actions/admin/staff-sessions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function CloseSessionModal({ id, staffName }: { id: string; staffName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(closeStaffSessionAction, null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Session closed.");
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs font-medium text-brand-light hover:underline"
      >
        <Lock size={12} /> Close Session
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Close Session — {staffName}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">Enter the physically counted amounts for each payment type.</p>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="actualCard">Actual Card</Label>
                  <Input id="actualCard" name="actualCard" type="number" min={0} step="0.01" defaultValue={0} required />
                </div>
                <div>
                  <Label htmlFor="actualCash">Actual Cash</Label>
                  <Input id="actualCash" name="actualCash" type="number" min={0} step="0.01" defaultValue={0} required />
                </div>
                <div>
                  <Label htmlFor="actualTransfer">Actual Transfer</Label>
                  <Input id="actualTransfer" name="actualTransfer" type="number" min={0} step="0.01" defaultValue={0} required />
                </div>
                <div>
                  <Label htmlFor="actualVoucher">Actual Ext. Voucher</Label>
                  <Input id="actualVoucher" name="actualVoucher" type="number" min={0} step="0.01" defaultValue={0} required />
                </div>
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Closing..." : "Close Session"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
