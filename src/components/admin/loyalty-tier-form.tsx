"use client";

import { useActionState } from "react";
import { createLoyaltyTierAction, type FormState } from "@/actions/admin/loyalty";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function LoyaltyTierForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createLoyaltyTierAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="name">Tier name</Label>
          <Input id="name" name="name" placeholder="Gold" required />
        </div>
        <div>
          <Label htmlFor="minPoints">Minimum points</Label>
          <Input id="minPoints" name="minPoints" type="number" min={0} step={1} required />
        </div>
        <div>
          <Label htmlFor="perks">Perks (optional)</Label>
          <Input id="perks" name="perks" placeholder="Free popcorn upgrade, priority seating..." />
        </div>
      </div>
      {state?.error && <FieldError>{state.error}</FieldError>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add Tier"}
      </Button>
    </form>
  );
}
