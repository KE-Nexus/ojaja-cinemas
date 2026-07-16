"use client";

import { useActionState } from "react";
import { createPromoCodeAction, type FormState } from "@/actions/admin/promo-codes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

export function PromoCodeForm() {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPromoCodeAction, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-5 sm:items-end">
      <div className="sm:col-span-1">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" placeholder="SUMMER25" required />
      </div>
      <div>
        <Label htmlFor="discountType">Type</Label>
        <Select id="discountType" name="discountType" defaultValue="PERCENT">
          <option value="PERCENT">% Percent</option>
          <option value="FIXED">₦ Fixed</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="discountValue">Value</Label>
        <Input id="discountValue" name="discountValue" type="number" min={1} required />
      </div>
      <div>
        <Label htmlFor="usageLimit">Usage limit</Label>
        <Input id="usageLimit" name="usageLimit" type="number" min={1} placeholder="Unlimited" />
      </div>
      <div>
        <Label htmlFor="expiresAt">Expires</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>
      <div className="sm:col-span-5">
        {state?.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" disabled={isPending} className="mt-1">
          {isPending ? "Creating..." : "Create Promo Code"}
        </Button>
      </div>
    </form>
  );
}
