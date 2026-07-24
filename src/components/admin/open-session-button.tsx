"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import { openStaffSessionAction } from "@/actions/admin/staff-sessions";
import { Button } from "@/components/ui/button";

export function OpenSessionButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await openStaffSessionAction();
          if (result?.error) toast.error(result.error);
          else toast.success("Session opened.");
        })
      }
    >
      <PlayCircle size={14} /> Open My Session
    </Button>
  );
}
