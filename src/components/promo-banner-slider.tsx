"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const AUTO_ADVANCE_MS = 5000;

/** Crossfades through every promotional image — meant to sit inside a `relative` container the caller already sizes (e.g. the branch page's hero band). */
export function PromoBannerSlider({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          unoptimized
          priority={i === 0}
          className={cn("object-cover transition-opacity duration-1000", i === index ? "opacity-100" : "opacity-0")}
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setIndex(i)}
              aria-label={`Show banner ${i + 1}`}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-brand" : "w-1.5 bg-white/40 hover:bg-white/60")}
            />
          ))}
        </div>
      )}
    </>
  );
}
