"use client";

import { useActionState } from "react";
import { createPurchaseOrderAction, type FormState } from "@/actions/admin/purchase-orders";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { StockLinesField, type StockLineItem } from "@/components/admin/stock-lines-field";

export function PurchaseOrderForm({ branchId, items }: { branchId: string; items: StockLineItem[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPurchaseOrderAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branchId" value={branchId} />

      <div>
        <Label htmlFor="supplierName">Supplier name</Label>
        <Input id="supplierName" name="supplierName" placeholder="Coca-Cola Distributors Ltd" required />
      </div>

      <StockLinesField items={items} withCost />

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending || items.length === 0}>
        {isPending ? "Creating..." : "Create Purchase Order"}
      </Button>
    </form>
  );
}
