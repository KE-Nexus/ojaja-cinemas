"use client";

import { useActionState } from "react";
import { createAuditoriumAction, type FormState } from "@/actions/admin/auditoriums";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import type { Branch } from "@prisma/client";

export function AuditoriumForm({ branches }: { branches: Branch[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createAuditoriumAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="branchId">Branch</Label>
        <Select id="branchId" name="branchId" required defaultValue="">
          <option value="" disabled>
            Select a branch
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="name">Screen name</Label>
        <Input id="name" name="name" placeholder="Screen 4" required />
      </div>
      <div>
        <Label htmlFor="screenType">Screen type</Label>
        <Select id="screenType" name="screenType" defaultValue="Standard">
          <option>Standard</option>
          <option>IMAX</option>
          <option>Recliner Suite</option>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rows">Rows</Label>
          <Input id="rows" name="rows" type="number" min={1} max={26} defaultValue={7} required />
        </div>
        <div>
          <Label htmlFor="seatsPerRow">Seats per row</Label>
          <Input id="seatsPerRow" name="seatsPerRow" type="number" min={1} max={40} defaultValue={12} required />
        </div>
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Auditorium"}
      </Button>
    </form>
  );
}
