import type { SeatCategory } from "@prisma/client";

export const CATEGORY_MULTIPLIER: Record<SeatCategory, number> = {
  STANDARD: 1,
  PREMIUM: 1.3,
  RECLINER: 1.8,
  ACCESSIBLE: 1,
};

export function seatPrice(basePrice: number, category: SeatCategory): number {
  return Math.round(basePrice * CATEGORY_MULTIPLIER[category]);
}
