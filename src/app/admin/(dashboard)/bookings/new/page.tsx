import { prisma } from "@/lib/prisma";
import { ManualBookingClient } from "@/components/admin/manual-booking-client";
import { formatShowtime } from "@/lib/format";

export default async function NewManualBookingPage() {
  const showtimes = await prisma.showtime.findMany({
    where: { startTime: { gte: new Date() } },
    include: { movie: true, auditorium: { include: { branch: true } } },
    orderBy: { startTime: "asc" },
    take: 100,
  });

  const options = showtimes.map((st) => ({
    id: st.id,
    label: `${st.movie.title} · ${st.auditorium.branch.name} (${st.auditorium.name}) · ${formatShowtime(st.startTime)}`,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 font-sans text-2xl font-bold tracking-tight">Box-Office Sale</h1>
      <p className="mb-6 text-sm text-muted">Sell tickets directly for a walk-in customer.</p>
      <ManualBookingClient showtimes={options} />
    </div>
  );
}
