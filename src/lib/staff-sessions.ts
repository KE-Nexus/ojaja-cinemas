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
 * Expected revenue is derived from actual Payment records (ticketed bookings) and
 * PosConcessionSale records (ticket-less walk-in sales) for this staff member while their
 * session was open — never stored, so it can't drift from the real sales ledger. Missing
 * the concession-only half was the actual bug behind sessions not reconciling against the
 * dashboard — ticket-less sales are real money collected and have to be counted here too.
 */
export async function expectedTotalsForSession(session: { staffId: string; openedAt: Date; closedAt: Date | null }): Promise<ExpectedTotals> {
  const windowEnd = session.closedAt ?? new Date();

  const [payments, concessionSales] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        booking: {
          processedById: session.staffId,
          createdAt: { gte: session.openedAt, lte: windowEnd },
        },
      },
      select: { method: true, amount: true },
    }),
    prisma.posConcessionSale.findMany({
      where: {
        cashierId: session.staffId,
        createdAt: { gte: session.openedAt, lte: windowEnd },
      },
      select: { paymentMethod: true, totalAmount: true },
    }),
  ]);

  const totals: ExpectedTotals = { card: 0, cash: 0, transfer: 0, voucher: 0 };
  for (const p of payments) {
    const key = METHOD_KEY[p.method.toUpperCase()];
    if (key) totals[key] += p.amount;
  }
  for (const c of concessionSales) {
    const key = METHOD_KEY[c.paymentMethod.toUpperCase()];
    if (key) totals[key] += c.totalAmount;
  }
  return totals;
}
