"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, CopyPlus, Download, X } from "lucide-react";
import { deleteDaySessionsAction, duplicateDayAction } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScheduleRoom } from "@/components/admin/scheduling-day-view";

export function SchedulingToolbar({
  rooms,
  auditoriumIds,
  dayStartISO,
  dayEndISO,
}: {
  rooms: ScheduleRoom[];
  auditoriumIds: string[];
  dayStartISO: string;
  dayEndISO: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  function handleDeleteAll() {
    if (!confirm("Delete every session shown for this day and room? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        const count = await deleteDaySessionsAction(auditoriumIds, dayStartISO, dayEndISO);
        toast.success(`Deleted ${count} session${count === 1 ? "" : "s"}.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete sessions.");
      }
    });
  }

  function handleDuplicate() {
    if (!targetDate) {
      toast.error("Pick a target date first.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await duplicateDayAction(auditoriumIds, dayStartISO, new Date(targetDate).toISOString());
        toast.success(`Duplicated ${created} session${created === 1 ? "" : "s"} to ${targetDate}.`);
        setDuplicateOpen(false);
        setTargetDate("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to duplicate sessions.");
      }
    });
  }

  function handleDownload() {
    const rows = rooms.flatMap((r) =>
      r.sessions.map((s) => ({
        room: r.name,
        movie: s.movieTitle,
        start: s.startTime,
        format: s.format,
        language: s.language,
        bookedSeats: s.bookedSeats,
        capacity: s.capacity,
      }))
    );
    if (rows.length === 0) {
      toast.error("No sessions to download for this day.");
      return;
    }
    const header = ["Room", "Movie", "Start Time", "Format", "Language", "Booked", "Capacity"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [r.room, `"${r.movie}"`, r.start, r.format, r.language, r.bookedSeats, r.capacity].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${dayStartISO.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="danger" size="sm" disabled={isPending} onClick={handleDeleteAll}>
        <Trash2 size={14} /> Delete Sessions
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setDuplicateOpen(true)}>
        <CopyPlus size={14} /> Duplicate Sessions
      </Button>
      <Button variant="secondary" size="sm" onClick={handleDownload}>
        <Download size={14} /> Download Session
      </Button>

      {duplicateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDuplicateOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Duplicate Sessions To</h3>
              <button onClick={() => setDuplicateOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">
              Copies every session shown for this day to the date you choose (same room, time, and movie).
            </p>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            <Button className="mt-4 w-full" disabled={isPending} onClick={handleDuplicate}>
              {isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
