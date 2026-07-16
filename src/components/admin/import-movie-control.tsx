"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { importMovieAction } from "@/actions/admin/movie-import";

export function ImportMovieControl({
  tmdbId,
  defaultStatus,
  existingMovieId,
}: {
  tmdbId: number;
  defaultStatus: "NOW_SHOWING" | "COMING_SOON";
  existingMovieId?: string;
}) {
  const [status, setStatus] = useState(defaultStatus);
  const [importedId, setImportedId] = useState<string | undefined>(existingMovieId);
  const [isPending, startTransition] = useTransition();

  if (importedId) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-success">
          <Check size={13} /> In catalog
        </span>
        <Link href={`/admin/movies/${importedId}/edit`} className="text-xs text-brand-light hover:underline">
          Edit
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as typeof status)}
        disabled={isPending}
        className="w-full min-w-0 rounded-md border border-border bg-surface-2 px-1.5 py-1 text-xs"
      >
        <option value="NOW_SHOWING">Now Showing</option>
        <option value="COMING_SOON">Coming Soon</option>
      </select>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              const { movieId } = await importMovieAction(tmdbId, status);
              setImportedId(movieId);
              toast.success("Added to catalog");
            } catch {
              toast.error("Couldn't import that title. Please try again.");
            }
          })
        }
        className="w-full rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
      >
        {isPending ? "Importing..." : "Import"}
      </button>
    </div>
  );
}
