"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { reopenStaffSessionAction } from "@/actions/admin/staff-sessions";

export function ReopenSessionButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await reopenStaffSessionAction(id);
          if (result?.error) toast.error(result.error);
          else toast.success("Session reopened.");
        })
      }
      className="flex items-center gap-1 text-xs font-medium text-muted hover:text-brand-light"
    >
      <RotateCcw size={12} /> Reopen
    </button>
  );
}
