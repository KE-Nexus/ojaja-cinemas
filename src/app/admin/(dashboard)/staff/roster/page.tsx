import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { BranchSelectForm } from "@/components/admin/branch-select-form";
import { RosterToolbar } from "@/components/admin/roster-toolbar";
import { ShiftCell } from "@/components/admin/shift-cell";

function weekStart(dateStr?: string) {
  const d = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // back up to Sunday
  return d;
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; date?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "SUPERVISOR" && session?.role !== "CIRCUIT_ADMIN") redirect("/admin");

  const { branch, date } = await searchParams;

  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const selectedBranch = branches.find((b) => b.id === branch) ?? branches[0];

  const start = weekStart(date);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dateParam = toDateInputValue(start);
  const prevWeek = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = end;

  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 24 * 60 * 60 * 1000));

  const [staff, shifts] = await Promise.all([
    selectedBranch
      ? prisma.user.findMany({
          where: { role: { not: "CUSTOMER" }, branchId: selectedBranch.id },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    selectedBranch
      ? prisma.rosterShift.findMany({ where: { branchId: selectedBranch.id, date: { gte: start, lt: end } } })
      : Promise.resolve([]),
  ]);

  const shiftByStaffAndDay = new Map<string, { id: string; startTime: string; endTime: string }>();
  for (const s of shifts) {
    shiftByStaffAndDay.set(`${s.staffId}:${toDateInputValue(s.date)}`, s);
  }

  const buildHref = (params: { date?: string }) => {
    const sp = new URLSearchParams();
    sp.set("branch", selectedBranch?.id ?? "");
    sp.set("date", params.date ?? dateParam);
    return `/admin/staff/roster?${sp.toString()}`;
  };

  const csvRows = staff.flatMap((s) =>
    days.map((d) => {
      const shift = shiftByStaffAndDay.get(`${s.id}:${toDateInputValue(d)}`);
      return {
        staffName: s.name,
        day: d.toLocaleDateString("en-NG", { weekday: "short", day: "2-digit", month: "short" }),
        shift: shift ? `${shift.startTime}-${shift.endTime}` : "Off",
      };
    })
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
          <p className="text-sm text-muted">Weekly staff schedule by cinema.</p>
        </div>
        <BranchSelectForm branches={branches} selectedBranchId={selectedBranch?.id} dateParam={dateParam} />
      </div>

      {selectedBranch && (
        <div className="mb-4">
          <RosterToolbar
            branchId={selectedBranch.id}
            weekStartISO={start.toISOString()}
            staffOptions={staff.map((s) => ({ id: s.id, name: s.name }))}
            csvRows={csvRows}
          />
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <Link href={buildHref({ date: toDateInputValue(prevWeek) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand/50">
          <ChevronLeft size={16} />
        </Link>
        <span className="text-sm font-medium">
          {start.toLocaleDateString("en-NG", { day: "2-digit", month: "short" })} – {days[6].toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <Link href={buildHref({ date: toDateInputValue(nextWeek) })} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:border-brand/50">
          <ChevronRight size={16} />
        </Link>
        <Link href={buildHref({ date: toDateInputValue(weekStart()) })} className="text-sm text-brand-light hover:underline">
          This Week
        </Link>
      </div>

      {!selectedBranch ? (
        <p className="text-muted">No branches configured.</p>
      ) : staff.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">No staff assigned to this cinema yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3 font-medium">Staff</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="p-3 font-medium">
                    {d.toLocaleDateString("en-NG", { weekday: "short" })} {d.getDate()}
                    {d.getDate() === 1 || d.getDate() === 21 || d.getDate() === 31
                      ? "st"
                      : d.getDate() === 2 || d.getDate() === 22
                        ? "nd"
                        : d.getDate() === 3 || d.getDate() === 23
                          ? "rd"
                          : "th"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{s.name}</td>
                  {days.map((d) => {
                    const dISO = toDateInputValue(d);
                    const shift = shiftByStaffAndDay.get(`${s.id}:${dISO}`);
                    return (
                      <td key={dISO} className="p-2">
                        <ShiftCell
                          staffId={s.id}
                          branchId={selectedBranch.id}
                          dateISO={dISO}
                          dateLabel={d.toLocaleDateString("en-NG", { weekday: "long", day: "2-digit", month: "short" })}
                          staffName={s.name}
                          shift={shift}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
