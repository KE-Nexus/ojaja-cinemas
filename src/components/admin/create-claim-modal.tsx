"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { createClaimAction, type FormState } from "@/actions/admin/roles";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function CreateClaimModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createClaimAction, null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Claim created.");
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Create
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Create Claim</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <div>
                <Label htmlFor="label">Claim name</Label>
                <Input id="label" name="label" placeholder="Can Do Something" required />
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating..." : "Create Claim"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
