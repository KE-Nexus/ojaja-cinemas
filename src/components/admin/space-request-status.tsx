"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateSpaceRequestStatusAction } from "@/actions/admin/space-requests";
import type { SpaceRequestStatus } from "@prisma/client";

export function SpaceRequestStatusSelect({ id, status }: { id: string; status: SpaceRequestStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as SpaceRequestStatus;
        startTransition(async () => {
          try {
            await updateSpaceRequestStatusAction(id, next);
            toast.success("Status updated.");
          } catch {
            toast.error("Failed to update status.");
          }
        });
      }}
      className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-xs"
    >
      <option value="NEW">New</option>
      <option value="CONTACTED">Contacted</option>
      <option value="CONFIRMED">Confirmed</option>
      <option value="DECLINED">Declined</option>
    </select>
  );
}
