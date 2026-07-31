"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ApproveButton({ action, confirmText, label = "Approve" }: { action: () => Promise<void>; confirmText?: string; label?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        startTransition(async () => {
          try {
            await action();
            toast.success("Done.");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong.");
          }
        });
      }}
    >
      <Check size={14} /> {isPending ? "Working..." : label}
    </Button>
  );
}
