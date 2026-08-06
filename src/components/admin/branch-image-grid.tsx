"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { deleteBranchImageAction } from "@/actions/admin/hive-settings";

function DeleteOverlayButton({ imageId }: { imageId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this image?")) return;
        startTransition(async () => {
          try {
            await deleteBranchImageAction(imageId);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
          }
        });
      }}
      aria-label="Delete image"
      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-all duration-200 hover:bg-danger disabled:opacity-100 disabled:pointer-events-none group-hover:opacity-100"
    >
      <Trash2 size={14} />
    </button>
  );
}

/** Self-contained so remounting it (via `key`) clears the picked files and its own "N selected" badge. */
function AddImageTile({ id, name }: { id: string; name: string }) {
  const [count, setCount] = useState(0);
  return (
    <label
      htmlFor={id}
      className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface-2/50 text-muted transition-colors hover:border-brand/50 hover:bg-brand/5 hover:text-brand-light"
    >
      <ImagePlus size={20} />
      <span className="text-xs font-medium">{count > 0 ? `${count} selected` : "Add photo"}</span>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => setCount(e.currentTarget.files?.length ?? 0)}
      />
    </label>
  );
}

export function BranchImageGrid({
  images,
  addInputId,
  addInputName,
  pickerKey,
}: {
  images: { id: string; dataUrl: string }[];
  addInputId: string;
  addInputName: string;
  pickerKey: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {images.map((img) => (
        <div key={img.id} className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-2">
          <Image src={img.dataUrl} alt="" fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <DeleteOverlayButton imageId={img.id} />
        </div>
      ))}
      <AddImageTile key={pickerKey} id={addInputId} name={addInputName} />
    </div>
  );
}
