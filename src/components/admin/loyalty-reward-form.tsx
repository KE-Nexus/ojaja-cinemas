"use client";

import { useActionState } from "react";
import { createLoyaltyRewardAction, type FormState } from "@/actions/admin/loyalty";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LoyaltyRewardForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createLoyaltyRewardAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="name">Reward name</Label>
          <Input id="name" name="name" placeholder="Free medium popcorn" required />
        </div>
        <div>
          <Label htmlFor="pointsCost">Points cost</Label>
          <Input id="pointsCost" name="pointsCost" type="number" min={1} step={1} required />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" name="description" />
        </div>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add Reward"}
      </Button>
    </form>
  );
}
