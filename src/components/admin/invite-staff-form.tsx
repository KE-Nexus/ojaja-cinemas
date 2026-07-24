"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inviteStaffAction, type FormState } from "@/actions/admin/staff";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

const ROLES = [
  { value: "TICKETER", label: "Ticketer" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "TECHNICIAN", label: "Technician" },
  { value: "AUDITOR", label: "Auditor" },
  { value: "CIRCUIT_ADMIN", label: "Circuit Admin" },
];

export function InviteStaffForm({ branches }: { branches: { id: string; name: string }[] }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(inviteStaffAction, null);

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">
          Invitation sent — a temporary password was emailed to the new staff member (visible in{" "}
          <Link href="/admin/notifications" className="text-brand-light hover:underline">
            Notifications
          </Link>{" "}
          for this demo).
        </p>
        <Link href="/admin/staff">
          <Button type="button">Back to Staff</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" required />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="TICKETER" required>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="branchId">Cinema (optional for Circuit Admin)</Label>
          <Select id="branchId" name="branchId" defaultValue="">
            <option value="">Circuit-wide / unassigned</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending invite..." : "Send Invite"}
      </Button>
    </form>
  );
}
