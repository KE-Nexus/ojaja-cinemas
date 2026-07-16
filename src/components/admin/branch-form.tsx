"use client";

import { useActionState } from "react";
import { createBranchAction, updateBranchAction, type FormState } from "@/actions/admin/branches";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, FieldError } from "@/components/ui/input";
import type { Branch } from "@prisma/client";

export function BranchForm({ branch }: { branch?: Branch }) {
  const action = branch ? updateBranchAction : createBranchAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {branch && <input type="hidden" name="id" value={branch.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Cinema name</Label>
          <Input id="name" name="name" defaultValue={branch?.name} placeholder="OJAJA Lagos" required />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={branch?.city} placeholder="Lagos" required />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={branch?.address} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" defaultValue={branch?.phone} placeholder="+234 1 700 1000" required />
        </div>
        <div>
          <Label htmlFor="openingHours">Opening hours</Label>
          <Input id="openingHours" name="openingHours" defaultValue={branch?.openingHours} placeholder="Daily 10:00–23:00" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lat">Latitude (optional)</Label>
          <Input id="lat" name="lat" type="number" step="any" defaultValue={branch?.lat ?? ""} />
        </div>
        <div>
          <Label htmlFor="lng">Longitude (optional)</Label>
          <Input id="lng" name="lng" type="number" step="any" defaultValue={branch?.lng ?? ""} />
        </div>
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : branch ? "Save Changes" : "Create Cinema"}
      </Button>
    </form>
  );
}
