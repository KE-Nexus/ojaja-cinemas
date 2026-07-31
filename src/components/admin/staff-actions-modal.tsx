"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X, Settings, Power } from "lucide-react";
import { toast } from "sonner";
import {
  toggleStaffStatusAction,
  updateStaffEmailAction,
  updateStaffPasswordAction,
  updateStaffPinAction,
  transferStaffAction,
  type FormState,
} from "@/actions/admin/staff";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

type Staff = { id: string; name: string; email: string; isActive: boolean; branchId: string | null };
type Branch = { id: string; name: string };

export function StaffActionsModal({
  staff,
  branches,
  canTransfer,
}: {
  staff: Staff;
  branches: Branch[];
  /** Only a Circuit Admin can move staff between cinemas. */
  canTransfer: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(staff.isActive);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-muted hover:text-brand-light"
        aria-label="Manage staff"
      >
        <Settings size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md space-y-5 rounded-xl border border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Manage {staff.name}</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">Account status</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await toggleStaffStatusAction(staff.id);
                      setIsActive((v) => !v);
                      toast.success(isActive ? "Staff disabled." : "Staff enabled.");
                    } catch {
                      toast.error("Couldn't update status.");
                    }
                  })
                }
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:border-brand/50"
              >
                <Power size={13} /> {isActive ? "Disable" : "Enable"}
              </button>
            </div>

            <EmailForm id={staff.id} defaultEmail={staff.email} />
            <PasswordForm id={staff.id} />
            <PinForm id={staff.id} />
            {canTransfer && <TransferForm id={staff.id} branches={branches} defaultBranchId={staff.branchId} />}
          </div>
        </div>
      )}
    </>
  );
}

function EmailForm({ id, defaultEmail }: { id: string; defaultEmail: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateStaffEmailAction, null);
  return (
    <MiniForm title="Edit email" state={state} action={formAction} isPending={isPending} id={id} successMessage="Email updated.">
      <Input name="email" type="email" defaultValue={defaultEmail} required />
    </MiniForm>
  );
}

function PasswordForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateStaffPasswordAction, null);
  return (
    <MiniForm title="Reset password" state={state} action={formAction} isPending={isPending} id={id} successMessage="Password updated.">
      <Input name="password" type="password" placeholder="New password" required />
    </MiniForm>
  );
}

function PinForm({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateStaffPinAction, null);
  return (
    <MiniForm title="Reset PIN" state={state} action={formAction} isPending={isPending} id={id} successMessage="PIN updated.">
      <Input name="pin" inputMode="numeric" placeholder="4–6 digit PIN" required />
    </MiniForm>
  );
}

function TransferForm({ id, branches, defaultBranchId }: { id: string; branches: Branch[]; defaultBranchId: string | null }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(transferStaffAction, null);
  return (
    <MiniForm title="Transfer to another cinema" state={state} action={formAction} isPending={isPending} id={id} successMessage="Staff transferred.">
      <Select name="branchId" defaultValue={defaultBranchId ?? ""} required>
        <option value="">Select a cinema</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </MiniForm>
  );
}

function MiniForm({
  title,
  state,
  action,
  isPending,
  id,
  successMessage,
  children,
}: {
  title: string;
  state: FormState;
  action: (formData: FormData) => void;
  isPending: boolean;
  id: string;
  successMessage: string;
  children: React.ReactNode;
}) {
  const lastHandled = useRef<FormState>(null);
  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success(successMessage);
    }
  }, [state, successMessage]);

  return (
    <form action={action} className="space-y-1.5 border-t border-border pt-3">
      <input type="hidden" name="id" value={id} />
      <Label className="text-xs">{title}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">{children}</div>
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          Save
        </Button>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
