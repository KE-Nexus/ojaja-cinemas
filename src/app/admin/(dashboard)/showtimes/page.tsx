import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteShowtimeAction } from "@/actions/admin/showtimes";
import { formatNaira, formatShowtime } from "@/lib/format";

export default async function AdminShowtimesPage() {
  const showtimes = await prisma.showtime.findMany({
    include: { movie: true, auditorium: { include: { branch: true } } },
    orderBy: { startTime: "asc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Showtimes</h1>
          <p className="text-sm text-muted">{showtimes.length} scheduled</p>
        </div>
        <Button href="/admin/showtimes/new">
          <Plus size={16} /> Add Showtime
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Movie</th>
              <th className="p-3 font-medium">Cinema</th>
              <th className="p-3 font-medium">Start Time</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {showtimes.map((st) => (
              <tr key={st.id} className="border-b border-border/50">
                <td className="p-3 font-medium">{st.movie.title}</td>
                <td className="p-3 text-muted">
                  {st.auditorium.branch.name} · {st.auditorium.name}
                </td>
                <td className="p-3 text-muted">{formatShowtime(st.startTime)}</td>
                <td className="p-3">{formatNaira(st.basePrice)}</td>
                <td className="p-3">
                  <DeleteButton action={deleteShowtimeAction.bind(null, st.id)} confirmText="Delete this showtime?" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
