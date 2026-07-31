"use client";

import { useActionState } from "react";
import { createStockRequestAction, type FormState } from "@/actions/admin/stock-requests";
import { Button } from "@/components/ui/button";
import { Textarea, Label, FieldError } from "@/components/ui/input";
import { StockLinesField, type StockLineItem } from "@/components/admin/stock-lines-field";

export function StockRequestForm({ branchId, items }: { branchId: string; items: StockLineItem[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createStockRequestAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branchId" value={branchId} />

      <StockLinesField items={items} />

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="Reason for this request..." />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending || items.length === 0}>
        {isPending ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
