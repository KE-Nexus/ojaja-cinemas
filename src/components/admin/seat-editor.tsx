"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SeatMap, type SeatMapSeat } from "@/components/seat-map";
import { updateSeatCategoryAction } from "@/actions/admin/auditoriums";
import type { SeatCategory } from "@prisma/client";

const CYCLE: SeatCategory[] = ["STANDARD", "PREMIUM", "RECLINER", "ACCESSIBLE"];

export function SeatEditor({
  seats: initialSeats,
  rows,
  seatsPerRow,
}: {
  seats: { id: string; row: string; number: number; category: SeatCategory }[];
  rows: string[];
  seatsPerRow: number;
}) {
  const [seats, setSeats] = useState<SeatMapSeat[]>(initialSeats.map((s) => ({ ...s, status: "AVAILABLE" as const })));
  const [, startTransition] = useTransition();

  function cycleCategory(seat: SeatMapSeat) {
    const currentIndex = CYCLE.indexOf(seat.category);
    const nextCategory = CYCLE[(currentIndex + 1) % CYCLE.length];

    setSeats((prev) => prev.map((s) => (s.id === seat.id ? { ...s, category: nextCategory } : s)));

    startTransition(async () => {
      try {
        await updateSeatCategoryAction(seat.id, nextCategory);
      } catch {
        toast.error("Failed to update seat category.");
      }
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted">Click a seat to cycle its category: Standard → Premium → Recliner → Accessible.</p>
      <SeatMap
        seats={seats}
        rows={rows}
        seatsPerRow={seatsPerRow}
        selectedSeatIds={new Set()}
        onToggle={cycleCategory}
      />
    </div>
  );
}
