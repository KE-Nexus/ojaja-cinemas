"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, DoorOpen, Lock, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";

type OthersAction = "openCashDrawer" | "closeSession" | "swapTicket";

const OPTIONS: { action: OthersAction; label: string; icon: React.ReactNode }[] = [
  { action: "swapTicket", label: "Swap Ticket", icon: <Repeat size={15} /> },
  { action: "openCashDrawer", label: "Open Cash Drawer", icon: <DoorOpen size={15} /> },
  { action: "closeSession", label: "Close Session", icon: <Lock size={15} /> },
];

export function OthersMenu({ onSelect }: { onSelect: (action: OthersAction) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ bottom: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Opens upward (dropup) — this button lives in the bottom action bar, so a
      // downward panel would run off the bottom of the viewport and get clipped.
      setPos({ bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
          open ? "border-brand-light text-white" : "border-white/10 text-muted hover:border-white/30 hover:text-white"
        )}
      >
        <MoreHorizontal size={14} /> Others
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ bottom: pos.bottom, right: pos.right }}
            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f] py-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]"
          >
            {OPTIONS.map((opt) => (
              <button
                key={opt.action}
                onClick={() => {
                  setOpen(false);
                  onSelect(opt.action);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
