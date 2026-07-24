import "server-only";
import { prisma } from "@/lib/prisma";

export type ExpectedTotals = { card: number; cash: number; transfer: number; voucher: number };

const METHOD_KEY: Record<string, keyof ExpectedTotals> = {
  CARD: "card",
  CASH: "cash",
  TRANSFER: "transfer",
  VOUCHER: "voucher",
};

/**
 * Expected revenue is derived from actual Payment records for bookings this staff
 * member processed while their session was open — never stored, so it can't drift
 * from the real sales ledger.
 */
export async function expectedTotalsForSession(session: { staffId: string; openedAt: Date; closedAt: Date | null }): Promise<ExpectedTotals> {
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
      booking: {
        processedById: session.staffId,
        createdAt: { gte: session.openedAt, lte: session.closedAt ?? new Date() },
      },
    },
    select: { method: true, amount: true },
  });

  const totals: ExpectedTotals = { card: 0, cash: 0, transfer: 0, voucher: 0 };
  for (const p of payments) {
    const key = METHOD_KEY[p.method.toUpperCase()];
    if (key) totals[key] += p.amount;
  }
  return totals;
}
