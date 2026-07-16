import { prisma } from "@/lib/prisma";
import { AuditoriumForm } from "@/components/admin/auditorium-form";

export default async function NewAuditoriumPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Add Auditorium</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <AuditoriumForm branches={branches} />
      </div>
    </div>
  );
}
