"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteButton({ action, confirmText = "Are you sure?" }: { action: () => Promise<void>; confirmText?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(confirmText)) return;
        startTransition(async () => {
          try {
            await action();
          } catch {
            toast.error("Something went wrong. Please try again.");
          }
        });
      }}
      className="text-muted hover:text-danger disabled:opacity-50"
      aria-label="Delete"
    >
      <Trash2 size={15} />
    </button>
  );
}
