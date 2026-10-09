"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Power, Trash2 } from "lucide-react";
import { toggleLanguageAction, deleteLanguageAction } from "@/actions/admin/languages";

export function LanguageActions({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await toggleLanguageAction(id);
            toast.success(isActive ? "Language disabled." : "Language enabled.");
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
          if (!confirm("Delete this language?")) return;
          startTransition(async () => {
            try {
              await deleteLanguageAction(id);
              toast.success("Language deleted.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
            }
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
