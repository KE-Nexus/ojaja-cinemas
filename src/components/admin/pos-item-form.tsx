"use client";

import { useActionState } from "react";
import { createPosItemAction, updatePosItemAction, type FormState } from "@/actions/admin/pos-items";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import type { PosItem } from "@prisma/client";

export function PosItemForm({
  item,
  branches,
  requireBranch,
}: {
  item?: PosItem;
  branches?: { id: string; name: string }[];
  requireBranch: boolean;
}) {
  const action = item ? updatePosItemAction : createPosItemAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="requireBranch" value={requireBranch ? "true" : "false"} />

      {requireBranch && branches && (
        <div>
          <Label htmlFor="branchId">Cinema</Label>
          <Select id="branchId" name="branchId" defaultValue={item?.branchId ?? ""} required>
            <option value="">Select a cinema</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={item?.name} placeholder="Large Popcorn" required />
      </div>

      <div>
        <Label htmlFor="description">Description (optional, shown to customers)</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} placeholder="Buttered popcorn, large tub" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="itemClass">Item class</Label>
          <Input id="itemClass" name="itemClass" defaultValue={item?.itemClass} placeholder="Concessions" required />
        </div>
        <div>
          <Label htmlFor="itemGroup">Item group</Label>
          <Input id="itemGroup" name="itemGroup" defaultValue={item?.itemGroup} placeholder="Popcorn" required />
        </div>
        <div>
          <Label htmlFor="defaultPrice">Default price (₦)</Label>
          <Input id="defaultPrice" name="defaultPrice" type="number" min={0} step="0.01" defaultValue={item?.defaultPrice} required />
        </div>
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : item ? "Save Changes" : "Create Item"}
      </Button>
    </form>
  );
}
