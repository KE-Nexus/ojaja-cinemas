import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SeatEditor } from "@/components/admin/seat-editor";

export default async function AuditoriumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auditorium = await prisma.auditorium.findUnique({
    where: { id },
    include: { branch: true, seats: true },
  });
  if (!auditorium) notFound();

  const rows = Array.from(new Set(auditorium.seats.map((s) => s.row))).sort();

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">
        {auditorium.name} <span className="font-sans text-lg font-normal text-muted">— {auditorium.branch.name}</span>
      </h1>
      <p className="mb-6 text-sm text-muted">
        {auditorium.screenType} · {auditorium.seats.length} seats
      </p>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <SeatEditor
          seats={auditorium.seats.map((s) => ({ id: s.id, row: s.row, number: s.number, category: s.category }))}
          rows={rows}
          seatsPerRow={auditorium.seatsPerRow}
        />
      </div>
    </div>
  );
}
