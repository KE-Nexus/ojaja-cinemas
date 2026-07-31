import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SchedulingDayView, type ScheduleRoom } from "@/components/admin/scheduling-day-view";
import { SchedulingToolbar } from "@/components/admin/scheduling-toolbar";
import { CreateSessionModal } from "@/components/admin/create-session-modal";
import { BranchSelectForm } from "@/components/admin/branch-select-form";
import { getBranchScope, resolveScopedBranchId } from "@/lib/branch-scope";

function dayStart(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; date?: string }>;
}) {
  const { branch, date } = await searchParams;

  const scope = await getBranchScope();
  const effectiveBranchId = resolveScopedBranchId(scope, branch);

  const branches = scope.isCircuitAdmin
    ? await prisma.branch.findMany({ orderBy: { name: "asc" } })
    : await prisma.branch.findMany({ where: { id: scope.branchId ?? undefined }, orderBy: { name: "asc" } });
  const selectedBranch = branches.find((b) => b.id === effectiveBranchId) ?? branches[0];

  const today = dayStart(date);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const prevDay = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const nextDay = tomorrow;

  const [auditoriums, movies] = await Promise.all([
    selectedBranch
      ? prisma.auditorium.findMany({ where: { branchId: selectedBranch.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    prisma.movie.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { title: "asc" } }),
  ]);

  const showtimes = selectedBranch
    ? await prisma.showtime.findMany({
        where: {
          auditoriumId: { in: auditoriums.map((a) => a.id) },
          startTime: { gte: today, lt: tomorrow },
        },
        include: {
          movie: true,
          bookings: { include: { seats: true } },
        },
      })
    : [];

  const rooms: ScheduleRoom[] = auditoriums.map((a) => ({
    id: a.id,
    name: a.name,
    sessions: showtimes
      .filter((st) => st.auditoriumId === a.id)
      .map((st) => ({
        id: st.id,
        movieId: st.movieId,
        movieTitle: st.movie.title,
        language: st.language,
        format: st.format,
        startTime: st.startTime.toISOString(),
        runtimeMins: st.movie.runtimeMins,
        bookedSeats: st.bookings
          .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
          .reduce((sum, b) => sum + b.seats.length, 0),
        capacity: a.rows * a.seatsPerRow,
      })),
  }));

  const dateParam = toDateInputValue(today);
  const buildHref = (params: { branch?: string; date?: string }) => {
    const sp = new URLSearchParams();
    sp.set("branch", params.branch ?? selectedBranch?.id ?? "");
    sp.set("date", params.date ?? dateParam);
    return `/admin/scheduling?${sp.toString()}`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Film Scheduling</h1>
          <p className="text-sm text-muted">Visual room-by-room session board.</p>
        </div>

        <BranchSelectForm branches={branches} selectedBranchId={selectedBranch?.id} dateParam={dateParam} locked={!scope.isCircuitAdmin} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <CreateSessionModal
          movies={movies.map((m) => ({ id: m.id, title: m.title }))}
          rooms={auditoriums.map((a) => ({ id: a.id, name: a.name }))}
          defaultDate={`${dateParam}T12:00`}
        />
        <SchedulingToolbar
          rooms={rooms}
          auditoriumIds={auditoriums.map((a) => a.id)}
          dayStartISO={today.toISOString()}
          dayEndISO={tomorrow.toISOString()}
        />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Link href={buildHref({ date: toDateInputValue(prevDay) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand/50">
          <ChevronLeft size={16} />
        </Link>
        <span className="text-sm font-medium">
          {today.toLocaleDateString("en-NG", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <Link href={buildHref({ date: toDateInputValue(nextDay) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand/50">
          <ChevronRight size={16} />
        </Link>
        <Link href={buildHref({ date: toDateInputValue(new Date()) })} className="text-sm text-brand-light hover:underline">
          Today
        </Link>
      </div>

      {!selectedBranch ? (
        <p className="text-muted">No branches configured.</p>
      ) : (
        <SchedulingDayView rooms={rooms} />
      )}
    </div>
  );
}
