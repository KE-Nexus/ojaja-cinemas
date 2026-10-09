import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasClaim } from "@/lib/claims";
import { ShowtimeForm } from "@/components/admin/showtime-form";

export default async function NewShowtimePage() {
  const session = await getSession();
  if (!session || !(await hasClaim(session.role, "CAN_UPDATE_SHOWTIMES"))) redirect("/admin");

  const [movies, auditoriums, languages] = await Promise.all([
    prisma.movie.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" } }),
    prisma.auditorium.findMany({ include: { branch: true }, orderBy: { name: "asc" } }),
    prisma.language.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Add Showtime</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <ShowtimeForm movies={movies} auditoriums={auditoriums} languages={languages} />
      </div>
    </div>
  );
}
