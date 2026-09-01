"use client";

import { useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function MovieImageUploader({
  id,
  name,
  label,
  currentUrl,
  shape,
  required,
}: {
  id: string;
  name: string;
  label: string;
  currentUrl?: string | null;
  shape: "poster" | "backdrop" | "square";
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const src = preview ?? currentUrl;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <label
        htmlFor={id}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2",
          shape === "poster" ? "aspect-[2/3] w-36" : shape === "square" ? "aspect-square w-32" : "aspect-video w-full"
        )}
      >
        {src ? (
          <Image src={src} alt="" fill unoptimized referrerPolicy="no-referrer" className="object-cover" />
        ) : (
          <span className="px-3 text-center text-xs text-muted">No {shape} yet</span>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <Camera size={16} />
          <span className="text-[11px] font-medium">{src ? "Change" : "Upload"}</span>
        </div>
        <input
          id={id}
          name={name}
          type="file"
          accept="image/*"
          required={required && !currentUrl}
          className="hidden"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </label>
    </div>
  );
}
