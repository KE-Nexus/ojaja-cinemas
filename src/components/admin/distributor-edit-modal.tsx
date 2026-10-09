"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateDistributorAction, type FormState } from "@/actions/admin/distributors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function DistributorEditModal({ distributor }: { distributor: { id: string; name: string; email: string; phone: string } }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(updateDistributorAction, null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Distributor updated.");
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-muted hover:text-brand-light" aria-label="Edit distributor">
        <Pencil size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Edit Distributor</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="id" value={distributor.id} />
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" name="name" defaultValue={distributor.name} required />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={distributor.email} required />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={distributor.phone} required />
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
