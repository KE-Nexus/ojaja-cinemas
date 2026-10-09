"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createLanguageAction, type FormState } from "@/actions/admin/languages";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LanguageForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createLanguageAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Language added.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Swahili" required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add Language"}
      </Button>
      {state?.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
