"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { syncLatestMoviesAction } from "@/actions/admin/movie-import";
import { Button } from "@/components/ui/button";

export function SyncMoviesButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            const { imported, updated, flipped } = await syncLatestMoviesAction();
            toast.success(
              `Synced with every.film — ${imported} added, ${updated} refreshed${flipped ? `, ${flipped} moved to Now Showing` : ""}.`
            );
          } catch {
            toast.error("Sync failed. Please try again.");
          }
        })
      }
    >
      <RefreshCw size={15} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Syncing..." : "Sync Latest Movies"}
    </Button>
  );
}
