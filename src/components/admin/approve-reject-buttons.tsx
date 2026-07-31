"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ApproveRejectButtons({
  onApprove,
  onReject,
  confirmApprove,
  confirmReject,
}: {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  confirmApprove?: string;
  confirmReject?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    startTransition(async () => {
      try {
        await action();
        toast.success("Done.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" disabled={isPending} onClick={() => run(onApprove, confirmApprove)}>
        <Check size={14} /> Approve
      </Button>
      <Button size="sm" variant="danger" disabled={isPending} onClick={() => run(onReject, confirmReject)}>
        <X size={14} /> Reject
      </Button>
    </div>
  );
}
