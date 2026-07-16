"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Power, Trash2 } from "lucide-react";
import { togglePromoCodeAction, deletePromoCodeAction } from "@/actions/admin/promo-codes";

export function PromoCodeActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await togglePromoCodeAction(id);
            toast.success(isActive ? "Promo code disabled." : "Promo code enabled.");
          })
        }
        className="text-muted hover:text-brand-light disabled:opacity-50"
        aria-label="Toggle active"
      >
        <Power size={15} />
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (!confirm("Delete this promo code?")) return;
          startTransition(async () => {
            await deletePromoCodeAction(id);
            toast.success("Promo code deleted.");
          });
        }}
        className="text-muted hover:text-danger disabled:opacity-50"
        aria-label="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
