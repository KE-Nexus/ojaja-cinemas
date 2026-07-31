"use client";

import { useActionState } from "react";
import { redeemVgdAction, type FormState } from "@/actions/admin/vgd";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";

export function VgdRedeemForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(redeemVgdAction, null);

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div>
        <Input name="code" placeholder="Enter code, e.g. VGD-AB12CD34" className="w-64 uppercase" required />
        {state?.error && <FieldError>{state.error}</FieldError>}
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Redeeming..." : "Redeem"}
      </Button>
    </form>
  );
}
