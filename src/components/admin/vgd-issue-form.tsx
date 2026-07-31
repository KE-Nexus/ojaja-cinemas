"use client";

import { useActionState } from "react";
import { issueVgdAction, type FormState } from "@/actions/admin/vgd";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";

export function VgdIssueForm({ branches, isCircuitAdmin }: { branches: { id: string; name: string }[]; isCircuitAdmin: boolean }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(issueVgdAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue="VOUCHER" required>
            <option value="VOUCHER">Voucher</option>
            <option value="GIFT_CARD">Gift Card</option>
            <option value="DISCOUNT">Discount</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="branchId">Cinema</Label>
          <Select id="branchId" name="branchId" defaultValue={isCircuitAdmin ? "" : branches[0]?.id}>
            {isCircuitAdmin && <option value="">All locations</option>}
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="value">Value</Label>
          <Input id="value" name="value" type="number" min={1} step="any" placeholder="5000" required />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPercent" className="h-4 w-4 rounded border-border" />
            This is a percentage discount
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="recipientName">Recipient name (optional)</Label>
          <Input id="recipientName" name="recipientName" placeholder="Customer or partner name" />
        </div>
        <div>
          <Label htmlFor="expiresAt">Expires (optional)</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Issuing..." : "Issue"}
      </Button>
    </form>
  );
}
