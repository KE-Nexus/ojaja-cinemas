"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createDistributorAction, type FormState } from "@/actions/admin/distributors";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function DistributorForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createDistributorAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Distributor added.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Universal Pictures" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="contact@distributor.com" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" placeholder="+2348012345678" required />
      </div>
      <div className="sm:col-span-4">
        {state?.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" disabled={isPending} className="mt-1">
          {isPending ? "Adding..." : "Add Distributor"}
        </Button>
      </div>
    </form>
  );
}
