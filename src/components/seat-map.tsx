"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { Armchair, Check, Lock } from "lucide-react";
import { ScreenGlow } from "@/components/decor/screen-glow";

export type SeatStatus = "AVAILABLE" | "LOCKED" | "BOOKED" | "SELECTED";
export type SeatCategory = "STANDARD" | "PREMIUM" | "RECLINER" | "ACCESSIBLE";

export type SeatMapSeat = {
  id: string;
  row: string;
  number: number;
  category: SeatCategory;
  status: SeatStatus;
};

const categoryClasses: Record<SeatCategory, string> = {
  STANDARD: "border-border text-muted hover:border-brand-light hover:text-brand-light",
  PREMIUM: "border-accent-gold/50 text-accent-gold hover:border-accent-gold",
  RECLINER: "border-brand/60 text-brand-light hover:border-brand-light",
  ACCESSIBLE: "border-accent-cyan/50 text-accent-cyan hover:border-accent-cyan",
};

export function SeatMap({
  seats,
  rows,
  seatsPerRow,
  selectedSeatIds,
  onToggle,
  readOnly = false,
}: {
  seats: SeatMapSeat[];
  rows: string[];
  seatsPerRow: number;
  selectedSeatIds: Set<string>;
  onToggle: (seat: SeatMapSeat) => void;
  readOnly?: boolean;
}) {
  const byRow = new Map<string, SeatMapSeat[]>();
  for (const seat of seats) {
    const list = byRow.get(seat.row) ?? [];
    list.push(seat);
    byRow.set(seat.row, list);
  }
  for (const list of byRow.values()) list.sort((a, b) => a.number - b.number);

  const mid = Math.ceil(seatsPerRow / 2);

  return (
    <div className="w-full">
      <div className="mx-auto mb-2 max-w-2xl">
        <ScreenGlow className="h-10 w-full" />
      </div>
      <p className="mb-8 text-center text-xs uppercase tracking-[0.4em] text-muted">Screen this way</p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-2 overflow-x-auto pb-2"
      >
        {rows.map((row) => {
          const rowSeats = byRow.get(row) ?? [];
          return (
            <div key={row} className="flex items-center gap-2">
              <span className="w-4 text-xs font-medium text-muted">{row}</span>
              <div className="flex gap-1.5">
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeatIds.has(seat.id) || seat.status === "SELECTED";
                  const isTaken = seat.status === "BOOKED" || seat.status === "LOCKED";
                  return (
                    <div key={seat.id} className={cn(seat.number === mid + 1 && "ml-3")}>
                      <motion.button
                        type="button"
                        disabled={isTaken || readOnly}
                        onClick={() => onToggle(seat)}
                        whileHover={!isTaken && !readOnly ? { scale: 1.12 } : undefined}
                        whileTap={!isTaken && !readOnly ? { scale: 0.92 } : undefined}
                        title={`${seat.row}${seat.number}`}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border text-[10px] font-medium transition-colors",
                          isTaken
                            ? "cursor-not-allowed border-transparent bg-surface-2/60 text-muted/30"
                            : isSelected
                              ? "border-brand bg-brand text-white"
                              : cn("bg-surface-2", categoryClasses[seat.category])
                        )}
                      >
                        {isSelected ? <Check size={14} /> : isTaken ? <Lock size={12} /> : <Armchair size={14} />}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
              <span className="w-4 text-xs font-medium text-muted">{row}</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
