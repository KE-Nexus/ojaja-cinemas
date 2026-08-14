"use client";

import { useActionState, useState } from "react";
import { createPriceCardAction, updatePriceCardAction, type FormState } from "@/actions/admin/price-cards";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import { DaySelectorField } from "@/components/admin/day-selector-field";
import { PriceCardTicketsField, type PriceCardTicketOption } from "@/components/admin/price-card-tickets-field";
import type { PriceCard } from "@prisma/client";

export function PriceCardForm({
  priceCard,
  branches,
  ticketOptions,
  initialTicketIds,
}: {
  priceCard?: PriceCard;
  branches: { id: string; name: string }[];
  ticketOptions: PriceCardTicketOption[];
  initialTicketIds: string[];
}) {
  const action = priceCard ? updatePriceCardAction : createPriceCardAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);
  const [branchId, setBranchId] = useState(priceCard?.branchId ?? "");

  return (
    <form action={formAction} className="space-y-6">
      {priceCard && <input type="hidden" name="id" value={priceCard.id} />}

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={priceCard?.name} placeholder="Weekdays" required />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={priceCard?.description ?? ""} placeholder="Weekdays Tickets" />
      </div>

      <DaySelectorField initialDays={priceCard?.days ?? []} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="branchId">Cinema</Label>
          <Select id="branchId" name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
            <option value="">Select a cinema</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isActive"
                value="true"
                defaultChecked={priceCard ? priceCard.isActive : true}
                className="accent-brand"
              />
              Active
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name="isActive"
                value="false"
                defaultChecked={priceCard ? !priceCard.isActive : false}
                className="accent-brand"
              />
              Inactive
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <PriceCardTicketsField options={ticketOptions} initialTicketIds={initialTicketIds} selectedBranchId={branchId} />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : priceCard ? "Save Changes" : "Create Price Card"}
      </Button>
    </form>
  );
}
