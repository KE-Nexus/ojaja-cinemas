"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(viewMonth: Date) {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function PosDatePicker({
  anchorRef,
  value,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [anchorRef, onClose]);

  const days = buildMonthGrid(viewMonth);

  return createPortal(
    <div
      ref={panelRef}
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-50 w-72 rounded-2xl border border-black/10 bg-white p-4 text-black shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
    >
      <p className="mb-3 text-center text-sm font-semibold text-black/70">Select Day</p>
      <div className="mb-3 rounded-lg border border-black/15 px-3 py-2 text-sm">
        {value.toLocaleDateString("en-NG", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/60 hover:bg-black/5"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold">{viewMonth.toLocaleDateString("en-NG", { month: "long", year: "numeric" })}</p>
        <button
          onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md text-black/60 hover:bg-black/5"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 font-medium text-black/50">
            {w}
          </span>
        ))}
        {days.map((d) => {
          const inMonth = d.getMonth() === viewMonth.getMonth();
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              onClick={() => {
                onSelect(d);
                onClose();
              }}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                !inMonth && "text-black/25",
                inMonth && !isSelected && "text-black hover:bg-black/10",
                isToday && !isSelected && "font-bold",
                isSelected && "bg-brand font-semibold text-white"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
