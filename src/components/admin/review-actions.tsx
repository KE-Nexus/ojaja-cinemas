"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { moderateReviewAction } from "@/actions/admin/reviews";

export function ReviewActions({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();

  function moderate(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      try {
        await moderateReviewAction(reviewId, status);
        toast.success(status === "APPROVED" ? "Review approved." : "Review rejected.");
      } catch {
        toast.error("Failed to update review.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => moderate("APPROVED")}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-success/40 text-success hover:bg-success/10 disabled:opacity-50"
        aria-label="Approve"
      >
        <Check size={14} />
      </button>
      <button
        disabled={isPending}
        onClick={() => moderate("REJECTED")}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-danger/40 text-danger hover:bg-danger/10 disabled:opacity-50"
        aria-label="Reject"
      >
        <X size={14} />
      </button>
    </div>
  );
}
