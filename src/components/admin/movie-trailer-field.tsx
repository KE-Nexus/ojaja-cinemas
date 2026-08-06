"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function MovieTrailerField({ currentUrl }: { currentUrl?: string | null }) {
  const isCurrentUpload = currentUrl?.startsWith("data:video");
  const [mode, setMode] = useState<"youtube" | "upload">(isCurrentUpload ? "upload" : "youtube");
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div>
      <Label>Trailer (optional)</Label>
      <input type="hidden" name="trailerMode" value={mode} />

      <div className="mb-2 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("youtube")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "youtube" ? "border-brand bg-brand text-white" : "border-border bg-surface-2/80 text-foreground/90 hover:border-brand/50"
          )}
        >
          YouTube URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "upload" ? "border-brand bg-brand text-white" : "border-border bg-surface-2/80 text-foreground/90 hover:border-brand/50"
          )}
        >
          Upload Video
        </button>
      </div>

      {mode === "youtube" ? (
        <Input
          name="trailerUrl"
          defaultValue={!isCurrentUpload ? (currentUrl ?? "") : ""}
          placeholder="https://www.youtube.com/embed/..."
        />
      ) : (
        <div>
          <input
            name="trailerVideo"
            type="file"
            accept="video/*"
            onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
            className="block w-full text-sm text-foreground/90 file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground/90 hover:file:border-brand/50"
          />
          <p className="mt-1.5 text-xs text-muted">
            {fileName
              ? `Selected: ${fileName}`
              : isCurrentUpload
                ? "A trailer video is already uploaded — choose a new file to replace it."
                : "MP4 or similar, up to 25MB."}
          </p>
        </div>
      )}
    </div>
  );
}
