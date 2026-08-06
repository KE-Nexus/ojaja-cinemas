"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function PosModalShell({
  title,
  onClose,
  children,
  widthClass = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={cn(
          "flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f] text-white shadow-[0_0_40px_-10px_rgba(194,44,201,0.4)]",
          widthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-brand/15 via-transparent to-accent-cyan/10 px-5 py-3.5">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
