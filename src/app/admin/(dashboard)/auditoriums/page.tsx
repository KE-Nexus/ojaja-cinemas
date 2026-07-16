import Link from "next/link";
import { Plus, Armchair } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAuditoriumAction } from "@/actions/admin/auditoriums";

export default async function AdminAuditoriumsPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: { auditoriums: { include: { _count: { select: { seats: true } } } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Auditoriums</h1>
          <p className="text-sm text-muted">Manage screens and seat layouts across all branches.</p>
        </div>
        <Button href="/admin/auditoriums/new">
          <Plus size={16} /> Add Auditorium
        </Button>
      </div>

      <div className="space-y-6">
        {branches.map((b) => (
          <div key={b.id} className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="mb-3 font-semibold">
              {b.name} <span className="font-normal text-muted">({b.city})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {b.auditoriums.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4">
                  <div>
                    <Link href={`/admin/auditoriums/${a.id}`} className="flex items-center gap-2 font-medium hover:text-brand-light">
                      <Armchair size={15} /> {a.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {a.screenType} · {a._count.seats} seats
                    </p>
                  </div>
                  <DeleteButton action={deleteAuditoriumAction.bind(null, a.id)} confirmText={`Delete ${a.name}? All seats and showtimes will be removed.`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
