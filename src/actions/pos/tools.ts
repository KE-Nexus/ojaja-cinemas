"use server";

import { prisma } from "@/lib/prisma";
import { requireRole, verifyPassword } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import { assertHasClaim, hasClaim } from "@/lib/claims";
import { swapBookingSeatsAction } from "@/actions/admin/bookings";

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type PosShowtimeOption = {
  id: string;
  movieTitle: string;
  posterUrl: string;
  auditoriumName: string;
  format: string;
  startTime: string;
  priceCardTicketIds: string[] | null;
};

/** Powers the Tickets tab's date picker — lets a cashier sell tickets for any future session, not just today's. */
export async function getShowtimesForDateAction(dateStr: string): Promise<{ error?: string; showtimes?: PosShowtimeOption[] }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session first." };

  const dayStart = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return { error: "Invalid date." };
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const showtimes = await prisma.showtime.findMany({
    where: { auditorium: { branchId: staffSession.branchId }, startTime: { gte: dayStart, lt: dayEnd }, status: "OPEN", salesOnPos: true },
    include: { movie: true, auditorium: true, priceCard: { include: { tickets: true } } },
    orderBy: { startTime: "asc" },
  });

  return {
    showtimes: showtimes.map((st) => ({
      id: st.id,
      movieTitle: st.movie.title,
      posterUrl: st.movie.posterUrl,
      auditoriumName: st.auditorium.name,
      format: st.format,
      startTime: st.startTime.toISOString(),
      priceCardTicketIds: st.priceCard ? st.priceCard.tickets.map((t) => t.ticketClassId) : null,
    })),
  };
}

export type AdminPinResult = { ok: boolean; name?: string; error?: string };

/** Any action that needs a Supervisor/CircuitAdmin to authorize something a Ticketer can't do alone. */
export async function verifyAdminPinAction(staffNumber: string, pin: string): Promise<AdminPinResult> {
  const user = await prisma.user.findUnique({ where: { staffNumber: staffNumber.trim() } });
  if (!user || !user.isActive || !user.pinHash) return { ok: false, error: "Invalid user number or PIN." };
  if (user.role !== "SUPERVISOR" && user.role !== "CIRCUIT_ADMIN") return { ok: false, error: "Only a Supervisor or Circuit Admin can authorize this." };
  const valid = await verifyPassword(pin, user.pinHash);
  if (!valid) return { ok: false, error: "Invalid user number or PIN." };
  return { ok: true, name: user.name };
}

export type FoundBooking = {
  id: string;
  reference: string;
  movie: string;
  branch: string;
  startTime: string;
  status: string;
  guestName: string | null;
  total: number;
  seats: { row: string; number: number; category: string }[];
  concessions: { name: string; quantity: number; price: number }[];
};

export async function findBookingAction(query: {
  reference?: string;
  phone?: string;
  email?: string;
}): Promise<{ error?: string; booking?: FoundBooking }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session first." };

  const reference = query.reference?.trim();
  const phone = query.phone?.trim();
  const email = query.email?.trim();
  if (!reference && !phone && !email) return { error: "Enter a booking code, phone number, or email." };

  const booking = await prisma.booking.findFirst({
    where: {
      ...(reference ? { reference: reference.toUpperCase() } : phone ? { guestPhone: phone } : { guestEmail: email }),
      showtime: { auditorium: { branchId: staffSession.branchId } },
    },
    include: {
      showtime: { include: { movie: true, auditorium: { include: { branch: true } } } },
      seats: { include: { seat: true } },
      concessions: { include: { posItem: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!booking) return { error: "No booking found at this cinema." };

  return {
    booking: {
      id: booking.id,
      reference: booking.reference,
      movie: booking.showtime.movie.title,
      branch: booking.showtime.auditorium.branch.name,
      startTime: booking.showtime.startTime.toISOString(),
      status: booking.status,
      guestName: booking.guestName,
      total: booking.totalAmount,
      seats: booking.seats.map((s) => ({ row: s.seat.row, number: s.seat.number, category: s.seat.category })),
      concessions: booking.concessions.map((c) => ({ name: c.posItem.name, quantity: c.quantity, price: c.priceAtBooking })),
    },
  };
}

/** Completes an unpaid (PENDING) booking found via Find Booking by charging it as a POS card
 * payment — same Payment shape `posCheckoutAction`'s card branch creates, just against an
 * existing booking instead of a freshly-built cart. */
export async function processBookingCardPaymentAction(bookingId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session first." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { showtime: { include: { auditorium: true } }, seats: true },
  });
  if (!booking) return { error: "This booking no longer exists." };
  if (booking.showtime.auditorium.branchId !== staffSession.branchId) return { error: "This booking doesn't belong to your cinema." };
  if (booking.status !== "PENDING") return { error: "This booking has already been processed." };

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", processedById: session.sub } });
    await tx.payment.create({
      data: { bookingId: booking.id, provider: "pos", method: "CARD", status: "SUCCESS", amount: booking.totalAmount, reference: `POS-${booking.reference}` },
    });
    await tx.seatLock.deleteMany({ where: { showtimeId: booking.showtimeId, seatId: { in: booking.seats.map((s) => s.seatId) } } });
  });

  await logAdminAction(session.sub, "UPDATE", "Booking", booking.reference, { channel: "pos", amount: booking.totalAmount, paymentMethod: "CARD" });
  return { success: true };
}

export type UserSalesSummary = { orders: number; ticketRevenue: number; concessionRevenue: number; total: number };

export async function getUserSalesAction(adminStaffNumber: string, adminPin: string): Promise<{ error?: string; summary?: UserSalesSummary; authorizedBy?: string }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const auth = await verifyAdminPinAction(adminStaffNumber, adminPin);
  if (!auth.ok) return { error: auth.error };

  const todayStart = startOfDay();
  const todayEnd = startOfDay(1);

  const [bookings, concessionSales] = await Promise.all([
    prisma.booking.findMany({ where: { processedById: session.sub, status: "CONFIRMED", createdAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.posConcessionSale.findMany({ where: { cashierId: session.sub, createdAt: { gte: todayStart, lt: todayEnd } } }),
  ]);

  const ticketRevenue = bookings.reduce((s, b) => s + b.totalAmount, 0);
  const concessionRevenue = concessionSales.reduce((s, c) => s + c.totalAmount, 0);

  await logAdminAction(session.sub, "READ", "PosSales", session.sub, { authorizedBy: auth.name });

  return {
    authorizedBy: auth.name,
    summary: { orders: bookings.length + concessionSales.length, ticketRevenue, concessionRevenue, total: ticketRevenue + concessionRevenue },
  };
}

export type PosOrder = { id: string; type: "Ticket" | "Concession"; label: string; amount: number; time: string; status: string };

export async function todaysOrdersAction(): Promise<{ error?: string; orders?: PosOrder[] }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session first." };

  const todayStart = startOfDay();
  const todayEnd = startOfDay(1);

  const [bookings, concessionSales] = await Promise.all([
    prisma.booking.findMany({
      where: { processedById: session.sub, createdAt: { gte: todayStart, lt: todayEnd } },
      include: { showtime: { include: { movie: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.posConcessionSale.findMany({
      where: { cashierId: session.sub, createdAt: { gte: todayStart, lt: todayEnd } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const orders: PosOrder[] = [
    ...bookings.map((b) => ({
      id: b.reference,
      type: "Ticket" as const,
      label: b.showtime.movie.title,
      amount: b.totalAmount,
      time: b.createdAt.toISOString(),
      status: b.status,
    })),
    ...concessionSales.map((s) => ({
      id: s.id,
      type: "Concession" as const,
      label: `${s.lines.length} item${s.lines.length === 1 ? "" : "s"}`,
      amount: s.totalAmount,
      time: s.createdAt.toISOString(),
      status: "CONFIRMED",
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  return { orders };
}

export async function openCashDrawerAction(): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const claimError = await assertHasClaim(session.role, "CAN_MANUALLY_OPEN_POS_CASH_DRAWER");
  if (claimError) return { error: claimError };

  await logAdminAction(session.sub, "UPDATE", "CashDrawer", session.sub, { action: "manual-open" });
  return { success: true };
}

/**
 * Re-seats a booking using the replacement ticket type(s) the cashier has staged in the
 * POS cart — this is what makes a genuine class swap possible (e.g. Standard → Recliner),
 * not just a same-category reshuffle. Reuses the existing admin swap action so the claim
 * check and seat-conflict logic stay in one place.
 */
export async function posSwapTicketAction(reference: string, replacementTicketClassIds: string[]): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "Open a session first." };
  if (replacementTicketClassIds.length === 0) return { error: "Ensure you have added the replacement ticket to cart." };

  const booking = await prisma.booking.findUnique({
    where: { reference: reference.trim().toUpperCase() },
    include: { seats: true, showtime: { include: { auditorium: true } } },
  });
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "CONFIRMED") return { error: "Only confirmed bookings can have seats swapped." };
  if (booking.showtime.auditorium.branchId !== staffSession.branchId) return { error: "This booking isn't at your cinema." };
  if (replacementTicketClassIds.length !== booking.seats.length) {
    return { error: `Add exactly ${booking.seats.length} replacement ticket(s) to the cart to match this booking's seat count.` };
  }

  const replacementClasses = await prisma.ticketClass.findMany({ where: { id: { in: replacementTicketClassIds } } });
  if (replacementClasses.length !== replacementTicketClassIds.length) return { error: "One or more replacement tickets couldn't be found." };
  if (replacementClasses.some((t) => t.branchId !== staffSession.branchId)) return { error: "One or more replacement tickets don't belong to your cinema." };

  const [bookedSeatIds, lockedSeatIds, allSeats] = await Promise.all([
    prisma.bookingSeat
      .findMany({ where: { booking: { showtimeId: booking.showtimeId, status: { in: ["PENDING", "CONFIRMED"] } } }, select: { seatId: true } })
      .then((rows) => new Set(rows.map((r) => r.seatId))),
    prisma.seatLock
      .findMany({ where: { showtimeId: booking.showtimeId, lockedUntil: { gt: new Date() } }, select: { seatId: true } })
      .then((rows) => new Set(rows.map((r) => r.seatId))),
    prisma.seat.findMany({ where: { auditoriumId: booking.showtime.auditoriumId } }),
  ]);

  const claimed = new Set([...bookedSeatIds, ...lockedSeatIds]);
  const newSeatIds: string[] = [];
  for (const ticketClassId of replacementTicketClassIds) {
    const tc = replacementClasses.find((t) => t.id === ticketClassId)!;
    const candidate = allSeats.find(
      (s) => !claimed.has(s.id) && !newSeatIds.includes(s.id) && (!tc.seatClass || s.category === tc.seatClass)
    );
    if (!candidate) return { error: `No available ${tc.seatClass ?? ""} seat for "${tc.description}".` };
    newSeatIds.push(candidate.id);
  }

  const fd = new FormData();
  fd.set("bookingId", booking.id);
  for (const id of newSeatIds) fd.append("seatIds", id);

  const result = await swapBookingSeatsAction(null, fd);
  if (result?.error) return { error: result.error };
  return { success: true };
}

export type SessionExpectedTotals = { cash: number; card: number; transfer: number; voucher: number };

/**
 * What the drawer *should* contain, broken down by tender type, for the cashier's own
 * currently-open session — bookings aren't linked to a StaffSession directly, but since a
 * cashier can only ever have one open session at a time (enforced at open-time) and every
 * POS booking requires one, `createdAt >= session.openedAt` reliably scopes to this session.
 * Transfer/Voucher are always 0 here honestly, not fabricated — POS checkout only ever
 * writes CASH or CARD payments today.
 */
export async function getSessionExpectedTotalsAction(): Promise<{ error?: string; totals?: SessionExpectedTotals }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "No open session." };

  const [bookings, concessionSales] = await Promise.all([
    prisma.booking.findMany({
      where: { processedById: session.sub, status: "CONFIRMED", createdAt: { gte: staffSession.openedAt } },
      include: { payments: true },
    }),
    prisma.posConcessionSale.findMany({ where: { staffSessionId: staffSession.id } }),
  ]);

  const totals: SessionExpectedTotals = { cash: 0, card: 0, transfer: 0, voucher: 0 };
  for (const b of bookings) {
    const method = b.payments[0]?.method;
    if (method === "CASH") totals.cash += b.totalAmount;
    else if (method === "CARD") totals.card += b.totalAmount;
  }
  for (const s of concessionSales) {
    if (s.paymentMethod === "CASH") totals.cash += s.totalAmount;
    else if (s.paymentMethod === "CARD") totals.card += s.totalAmount;
  }

  return { totals };
}

/**
 * A Ticketer can't reconcile their own drawer (CAN_CLOSE_SESSIONS is Supervisor-and-up by
 * design — see claims.ts) — this lets a Supervisor authorize the close with their own PIN
 * right at the till, instead of the Ticketer needing separate admin access.
 */
export async function posCloseSessionAction(
  amounts: { cash: number; card: number; transfer: number; voucher: number },
  admin?: { staffNumber: string; pin: string }
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["TICKETER", "SUPERVISOR", "CIRCUIT_ADMIN"]);
  const staffSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!staffSession) return { error: "No open session to close." };

  let closedById = session.sub;
  if (!(await hasClaim(session.role, "CAN_CLOSE_SESSIONS"))) {
    if (!admin) return { error: "Ask a Supervisor to authorize closing this session." };
    const auth = await verifyAdminPinAction(admin.staffNumber, admin.pin);
    if (!auth.ok) return { error: auth.error };
    const adminUser = await prisma.user.findUnique({ where: { staffNumber: admin.staffNumber.trim() } });
    closedById = adminUser!.id;
  }

  const clamp = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

  await prisma.staffSession.update({
    where: { id: staffSession.id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedById,
      actualCash: clamp(amounts.cash),
      actualCard: clamp(amounts.card),
      actualTransfer: clamp(amounts.transfer),
      actualVoucher: clamp(amounts.voucher),
    },
  });

  await logAdminAction(closedById, "UPDATE", "StaffSession", staffSession.id, { action: "close", channel: "pos" });
  return { success: true };
}
