"use client";

import { useActionState } from "react";
import { createStockReceiptAction, type FormState } from "@/actions/admin/stock-receipts";
import { Button } from "@/components/ui/button";
import { Select, Label, FieldError } from "@/components/ui/input";
import { StockLinesField, type StockLineItem } from "@/components/admin/stock-lines-field";

export function StockReceiptForm({
  branchId,
  items,
  approvedRequests,
}: {
  branchId: string;
  items: StockLineItem[];
  approvedRequests: { id: string; createdAt: Date }[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createStockReceiptAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="branchId" value={branchId} />

      {approvedRequests.length > 0 && (
        <div>
          <Label htmlFor="stockRequestId">Link to approved stock request (optional)</Label>
          <Select id="stockRequestId" name="stockRequestId" defaultValue="">
            <option value="">Not linked to a request</option>
            {approvedRequests.map((r) => (
              <option key={r.id} value={r.id}>
                Request from {new Date(r.createdAt).toLocaleDateString()}
              </option>
            ))}
          </Select>
        </div>
      )}

      <StockLinesField items={items} />

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending || items.length === 0}>
        {isPending ? "Recording..." : "Record Receipt"}
      </Button>
    </form>
  );
}
