"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createRosterShiftAction, deleteRosterShiftAction, type FormState } from "@/actions/admin/roster";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function ShiftCell({
  staffId,
  branchId,
  dateISO,
  dateLabel,
  staffName,
  shift,
}: {
  staffId: string;
  branchId: string;
  dateISO: string;
  dateLabel: string;
  staffName: string;
  shift?: { id: string; startTime: string; endTime: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createRosterShiftAction, null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Shift saved.");
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          shift
            ? "w-full rounded-md border border-brand/40 bg-brand/10 px-1.5 py-1 text-[11px] font-medium text-brand-light hover:border-brand"
            : "flex w-full items-center justify-center rounded-md border border-dashed border-border py-1.5 text-muted hover:border-brand-light hover:text-brand-light"
        }
      >
        {shift ? `${shift.startTime}–${shift.endTime}` : <Plus size={12} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {staffName} · {dateLabel}
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="staffId" value={staffId} />
              <input type="hidden" name="branchId" value={branchId} />
              <input type="hidden" name="date" value={dateISO} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`start-${staffId}-${dateISO}`}>Start</Label>
                  <Input id={`start-${staffId}-${dateISO}`} name="startTime" type="time" defaultValue={shift?.startTime ?? "10:00"} required />
                </div>
                <div>
                  <Label htmlFor={`end-${staffId}-${dateISO}`}>End</Label>
                  <Input id={`end-${staffId}-${dateISO}`} name="endTime" type="time" defaultValue={shift?.endTime ?? "18:00"} required />
                </div>
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <div className="flex items-center gap-2">
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Shift"}
                </Button>
                {shift && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() =>
                      startDeleteTransition(async () => {
                        await deleteRosterShiftAction(shift.id);
                        toast.success("Shift removed.");
                        setOpen(false);
                      })
                    }
                    className="rounded-lg border border-border p-2.5 text-danger hover:border-danger/50"
                    aria-label="Remove shift"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
