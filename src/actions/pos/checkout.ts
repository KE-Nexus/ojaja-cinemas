"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { generateBookingReference } from "@/lib/booking";
import type { SeatCategory } from "@prisma/client";

export type PosCheckoutResult = { error?: string; success?: boolean; reference?: string; total?: number };

type CartInput = {
  showtimeId: string | null;
  ticketLines: { ticketClassId: string; quantity: number }[];
  itemLines: { posItemId: string; quantity: number }[];
};

type ResolvedTicketLine = { ticketClassId: string; quantity: number };
type ResolvedItemLine = { posItemId: string; quantity: number };

/** Package-kind tickets aren't sold as a single flat line — they expand into their real bundled tickets/items. */
async function expandPackages(
  ticketLines: { ticketClassId: string; quantity: number }[]
): Promise<{ error: string | null; tickets: ResolvedTicketLine[]; items: ResolvedItemLine[] }> {
  const classes = await prisma.ticketClass.findMany({ where: { id: { in: ticketLines.map((l) => l.ticketClassId) } } });
  if (classes.length !== ticketLines.length) return { error: "One or more ticket types couldn't be found.", tickets: [], items: [] };

  const tickets: ResolvedTicketLine[] = [];
  const items: ResolvedItemLine[] = [];
  const packageLines = ticketLines.filter((l) => classes.find((c) => c.id === l.ticketClassId)?.kind === "PACKAGE");

  const packageContents =
    packageLines.length > 0
      ? await prisma.ticketClass.findMany({
          where: { id: { in: packageLines.map((l) => l.ticketClassId) } },
          include: { packageTicketLines: true, packageItemLines: true },
        })
      : [];

  for (const line of ticketLines) {
    const tc = classes.find((c) => c.id === line.ticketClassId)!;
    if (tc.kind !== "PACKAGE") {
      tickets.push(line);
      continue;
    }
    const pkg = packageContents.find((p) => p.id === tc.id)!;
    for (const sub of pkg.packageTicketLines) {
      tickets.push({ ticketClassId: sub.ticketClassId, quantity: sub.quantity * line.quantity });
    }
    for (const sub of pkg.packageItemLines) {
      items.push({ posItemId: sub.posItemId, quantity: sub.quantity * line.quantity });
    }
  }

  // Merge duplicate lines that can arise from expanding multiple packages (or a package
  // alongside a directly-added ticket/item of the same type).
  const mergedTickets = new Map<string, number>();
  for (const t of tickets) mergedTickets.set(t.ticketClassId, (mergedTickets.get(t.ticketClassId) ?? 0) + t.quantity);
  const mergedItems = new Map<string, number>();
  for (const i of items) mergedItems.set(i.posItemId, (mergedItems.get(i.posItemId) ?? 0) + i.quantity);

  return {
    error: null,
    tickets: Array.from(mergedTickets, ([ticketClassId, quantity]) => ({ ticketClassId, quantity })),
    items: Array.from(mergedItems, ([posItemId, quantity]) => ({ posItemId, quantity })),
  };
}

export async function posCheckoutAction(cart: CartInput, paymentMethod: "CASH" | "CARD"): Promise<PosCheckoutResult> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);

  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session before selling." };

  const rawTicketLines = cart.ticketLines.filter((l) => l.quantity > 0);
  const rawItemLines = cart.itemLines.filter((l) => l.quantity > 0);
  if (rawTicketLines.length === 0 && rawItemLines.length === 0) return { error: "Cart is empty." };

  const expanded = rawTicketLines.length > 0 ? await expandPackages(rawTicketLines) : { error: null, tickets: [], items: [] };
  if (expanded.error) return { error: expanded.error };

  const ticketLines = expanded.tickets;
  const itemLines = [...rawItemLines];
  for (const l of expanded.items) {
    const existing = itemLines.find((x) => x.posItemId === l.posItemId);
    if (existing) existing.quantity += l.quantity;
    else itemLines.push(l);
  }

  const items = itemLines.length > 0 ? await prisma.posItem.findMany({ where: { id: { in: itemLines.map((l) => l.posItemId) } } }) : [];
  if (items.length !== itemLines.length) return { error: "One or more items couldn't be found." };
  if (items.some((it) => it.branchId !== staffSession.branchId)) {
    return { error: "One or more items don't belong to your cinema." };
  }
  const itemTotal = itemLines.reduce((sum, l) => sum + items.find((it) => it.id === l.posItemId)!.defaultPrice * l.quantity, 0);

  // No tickets (after package expansion) — this is a walk-in concession sale, no showtime involved.
  if (ticketLines.length === 0) {
    const total = itemTotal;
    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.posConcessionSale.create({
        data: {
          branchId: staffSession.branchId,
          cashierId: session.sub,
          staffSessionId: staffSession.id,
          paymentMethod,
          totalAmount: total,
          lines: {
            create: itemLines.map((l) => ({
              posItemId: l.posItemId,
              quantity: l.quantity,
              priceAtBooking: items.find((it) => it.id === l.posItemId)!.defaultPrice,
            })),
          },
        },
      });
      return created;
    });

    await logAdminAction(session.sub, "CREATE", "PosConcessionSale", sale.id, { channel: "pos", amount: total, paymentMethod });
    return { success: true, reference: sale.id, total };
  }

  if (!cart.showtimeId) return { error: "No showtime selected for the tickets in this order." };

  const showtime = await prisma.showtime.findUnique({ where: { id: cart.showtimeId }, include: { auditorium: true, movie: true } });
  if (!showtime) return { error: "This showtime no longer exists." };
  if (showtime.auditorium.branchId !== staffSession.branchId) {
    return { error: "This showtime doesn't belong to your cinema." };
  }

  const ticketClasses = await prisma.ticketClass.findMany({ where: { id: { in: ticketLines.map((l) => l.ticketClassId) } } });
  if (ticketClasses.length !== ticketLines.length) return { error: "One or more ticket types couldn't be found." };
  if (ticketClasses.some((t) => t.branchId !== staffSession.branchId)) {
    return { error: "One or more ticket types don't belong to your cinema." };
  }

  const [bookedSeatIds, lockedSeatIds, allSeats] = await Promise.all([
    prisma.bookingSeat
      .findMany({ where: { booking: { showtimeId: showtime.id, status: { in: ["PENDING", "CONFIRMED"] } } }, select: { seatId: true } })
      .then((rows) => new Set(rows.map((r) => r.seatId))),
    prisma.seatLock
      .findMany({ where: { showtimeId: showtime.id, lockedUntil: { gt: new Date() } }, select: { seatId: true } })
      .then((rows) => new Set(rows.map((r) => r.seatId))),
    prisma.seat.findMany({ where: { auditoriumId: showtime.auditoriumId } }),
  ]);

  const claimed = new Set<string>([...bookedSeatIds, ...lockedSeatIds]);
  const assignedSeats: { seatId: string; category: SeatCategory; ticketClassId: string; price: number }[] = [];

  for (const line of ticketLines) {
    const ticketClass = ticketClasses.find((t) => t.id === line.ticketClassId)!;
    const candidates = allSeats.filter(
      (s) => !claimed.has(s.id) && !assignedSeats.some((a) => a.seatId === s.id) && (!ticketClass.seatClass || s.category === ticketClass.seatClass)
    );
    if (candidates.length < line.quantity) {
      return { error: `Not enough ${ticketClass.seatClass ?? ""} seats available for "${ticketClass.description}".` };
    }
    for (let i = 0; i < line.quantity; i++) {
      assignedSeats.push({ seatId: candidates[i].id, category: candidates[i].category, ticketClassId: ticketClass.id, price: ticketClass.defaultPrice });
    }
  }

  const ticketTotal = assignedSeats.reduce((s, a) => s + a.price, 0);
  const total = ticketTotal + itemTotal;
  const reference = generateBookingReference();

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        reference,
        processedById: session.sub,
        showtimeId: showtime.id,
        status: "CONFIRMED",
        subtotal: total,
        totalAmount: total,
      },
    });

    for (const a of assignedSeats) {
      await tx.bookingSeat.create({ data: { bookingId: booking.id, seatId: a.seatId, priceAtBooking: a.price } });
    }

    for (const l of itemLines) {
      const item = items.find((it) => it.id === l.posItemId)!;
      await tx.bookingConcession.create({
        data: { bookingId: booking.id, posItemId: item.id, quantity: l.quantity, priceAtBooking: item.defaultPrice },
      });
    }

    await tx.payment.create({
      data: { bookingId: booking.id, provider: "pos", method: paymentMethod, status: "SUCCESS", amount: total, reference: `POS-${reference}` },
    });

    await tx.seatLock.deleteMany({ where: { showtimeId: showtime.id, seatId: { in: assignedSeats.map((a) => a.seatId) } } });
  });

  await logAdminAction(session.sub, "CREATE", "Booking", reference, { channel: "pos", amount: total, paymentMethod });

  return { success: true, reference, total };
}
