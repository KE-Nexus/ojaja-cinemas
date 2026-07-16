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
      <option value="BOX_OFFICE">Box Office</option>
      <option value="MARKETING">Marketing</option>
      <option value="MANAGER">Manager</option>
      <option value="ADMIN">Admin</option>
    </select>
  );
}
