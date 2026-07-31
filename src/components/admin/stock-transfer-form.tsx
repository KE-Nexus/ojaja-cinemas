"use client";

import { useActionState } from "react";
import { createStockTransferAction, type FormState } from "@/actions/admin/stock-transfers";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { StockLinesField, type StockLineItem } from "@/components/admin/stock-lines-field";

export function StockTransferForm({
  fromBranchId,
  toBranchId,
  items,
}: {
  fromBranchId: string;
  toBranchId: string;
  items: (StockLineItem & { stockOnHand: number })[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createStockTransferAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="fromBranchId" value={fromBranchId} />
      <input type="hidden" name="toBranchId" value={toBranchId} />

      <StockLinesField items={items} />

      <p className="text-xs text-muted">
        On-hand at source: {items.map((i) => `${i.name} (${i.stockOnHand})`).join(", ") || "—"}
      </p>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending || items.length === 0}>
        {isPending ? "Submitting..." : "Initiate Transfer"}
      </Button>
    </form>
  );
}
