"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserRoleAction } from "@/actions/admin/users";
import type { Role } from "@prisma/client";

export function UserRoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as Role;
        startTransition(async () => {
          try {
            await updateUserRoleAction(userId, next);
            toast.success("Role updated.");
          } catch {
            toast.error("Failed to update role.");
          }
        });
      }}
      className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
    >
      <option value="CUSTOMER">Customer</option>
      <option value="TICKETER">Ticketer</option>
      <option value="ACCOUNTANT">Accountant</option>
      <option value="SUPERVISOR">Supervisor</option>
      <option value="TECHNICIAN">Technician</option>
      <option value="AUDITOR">Auditor</option>
      <option value="CIRCUIT_ADMIN">Circuit Admin</option>
    </select>
  );
}
