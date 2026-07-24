"use client";

import { useActionState } from "react";
import { createTicketClassAction, updateTicketClassAction, type FormState } from "@/actions/admin/ticket-classes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import type { TicketClass } from "@prisma/client";

export function TicketClassForm({
  ticket,
  branches,
}: {
  ticket?: TicketClass;
  branches: { id: string; name: string }[];
}) {
  const action = ticket ? updateTicketClassAction : createTicketClassAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {ticket && <input type="hidden" name="id" value={ticket.id} />}

      <div>
        <Label htmlFor="branchId">Cinema</Label>
        <Select id="branchId" name="branchId" defaultValue={ticket?.branchId} required>
          <option value="">Select a cinema</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={ticket?.description} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="className">Ticket class</Label>
          <Input id="className" name="className" defaultValue={ticket?.className} placeholder="Standard, Premium..." required />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <Input id="type" name="type" defaultValue={ticket?.type} placeholder="Adult, Child, Student..." required />
        </div>
        <div>
          <Label htmlFor="defaultPrice">Default price (₦)</Label>
          <Input id="defaultPrice" name="defaultPrice" type="number" min={0} step="0.01" defaultValue={ticket?.defaultPrice} required />
        </div>
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : ticket ? "Save Changes" : "Create Ticket Class"}
      </Button>
    </form>
  );
}
