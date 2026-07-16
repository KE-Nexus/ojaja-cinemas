"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { refundBookingAction } from "@/actions/admin/bookings";
import { Button } from "@/components/ui/button";

export function RefundButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Process a full refund for this booking?")) return;
        startTransition(async () => {
          try {
            await refundBookingAction(bookingId);
            toast.success("Booking refunded.");
          } catch {
            toast.error("Failed to process refund.");
          }
        });
      }}
    >
      <RotateCcw size={14} /> {isPending ? "Processing..." : "Process Refund"}
    </Button>
  );
}
