import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/roles";
import { hasClaim } from "@/lib/claims";
import { OpenSessionPrompt } from "@/components/pos/open-session-prompt";
import { PosTerminal } from "@/components/pos/pos-terminal";

export const metadata: Metadata = { title: "POS | OJAJA Cinemas" };

function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function PosPage() {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) redirect("/pos/login");

  const me = await prisma.user.findUnique({ where: { id: session.sub }, include: { branch: true } });
  if (!me) redirect("/pos/login");
  if (!me.branchId || !me.branch) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-muted">Your account isn&rsquo;t assigned to a cinema yet. Ask an admin to assign you a branch.</p>
      </div>
    );
  }

  const openSession = await prisma.staffSession.findFirst({ where: { staffId: session.sub, status: "OPEN" } });
  if (!openSession) {
    return <OpenSessionPrompt staffName={me.name} branchName={me.branch.name} />;
  }

  const todayStart = startOfDay();
  const todayEnd = startOfDay(1);

  const canCloseSessionSelf = await hasClaim(session.role, "CAN_CLOSE_SESSIONS");

  const [showtimes, ticketClasses, items] = await Promise.all([
    prisma.showtime.findMany({
      where: { auditorium: { branchId: me.branchId }, startTime: { gte: todayStart, lt: todayEnd }, status: "OPEN", salesOnPos: true },
      include: { movie: true, auditorium: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.ticketClass.findMany({
      where: { branchId: me.branchId, isActive: true },
      include: {
        packageTicketLines: { include: { ticketClass: true } },
        packageItemLines: { include: { posItem: true } },
      },
      orderBy: { description: "asc" },
    }),
    prisma.posItem.findMany({
      where: { branchId: me.branchId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <PosTerminal
      staffName={me.name}
      branchName={me.branch.name}
      showtimes={showtimes.map((st) => ({
        id: st.id,
        movieTitle: st.movie.title,
        posterUrl: st.movie.posterUrl,
        auditoriumName: st.auditorium.name,
        format: st.format,
        startTime: st.startTime.toISOString(),
      }))}
      ticketClasses={ticketClasses.map((t) => ({
        id: t.id,
        label: t.description,
        price: t.defaultPrice,
        kind: t.kind,
        seatClass: t.seatClass,
        packageContents:
          t.kind === "PACKAGE"
            ? {
                tickets: t.packageTicketLines.map((l) => ({ label: l.ticketClass.description, quantity: l.quantity })),
                items: t.packageItemLines.map((l) => ({ name: l.posItem.name, quantity: l.quantity })),
              }
            : null,
      }))}
      items={items.map((it) => ({ id: it.id, name: it.name, price: it.defaultPrice, group: it.itemGroup, imageUrl: it.imageUrl }))}
      canCloseSessionSelf={canCloseSessionSelf}
    />
  );
}
