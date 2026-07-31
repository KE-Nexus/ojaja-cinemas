"use client";

import { useActionState } from "react";
import { adjustLoyaltyPointsAction, type FormState } from "@/actions/admin/loyalty";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LoyaltyAdjustForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(adjustLoyaltyPointsAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="delta">Points (use negative to deduct)</Label>
          <Input id="delta" name="delta" type="number" step={1} placeholder="100 or -50" required />
        </div>
        <div>
          <Label htmlFor="reason">Reason</Label>
          <Input id="reason" name="reason" placeholder="Goodwill credit, correction..." required />
        </div>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Apply Adjustment"}
      </Button>
    </form>
  );
}
