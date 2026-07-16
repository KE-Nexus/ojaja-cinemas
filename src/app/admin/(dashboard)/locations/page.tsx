import Link from "next/link";
import { Plus, Pencil, MapPin, Phone, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteBranchAction } from "@/actions/admin/branches";

export default async function AdminLocationsPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { auditoriums: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Locations</h1>
          <p className="text-sm text-muted">{branches.length} cinemas</p>
        </div>
        <Button href="/admin/locations/new">
          <Plus size={16} /> Add Cinema
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <div key={b.id} className="glow-card rounded-xl border border-border bg-surface p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{b.name}</h2>
                <p className="text-xs text-muted">{b.city}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/admin/locations/${b.id}/edit`} className="text-muted hover:text-brand-light">
                  <Pencil size={15} />
                </Link>
                <DeleteButton
                  action={deleteBranchAction.bind(null, b.id)}
                  confirmText={`Delete ${b.name}? This also removes its auditoriums, seats, and showtimes.`}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-muted">
              <p className="flex items-start gap-1.5">
                <MapPin size={12} className="mt-0.5 shrink-0" /> {b.address}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={12} className="shrink-0" /> {b.phone}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock size={12} className="shrink-0" /> {b.openingHours}
              </p>
            </div>

            <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
              {b._count.auditoriums} screen{b._count.auditoriums === 1 ? "" : "s"} ·{" "}
              <Link href={`/admin/auditoriums`} className="text-brand-light hover:underline">
                Manage auditoriums
              </Link>
            </div>
          </div>
        ))}

        {branches.length === 0 && <p className="text-muted">No cinema locations yet.</p>}
      </div>
    </div>
  );
}
