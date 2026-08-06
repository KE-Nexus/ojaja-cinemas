"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, CopyPlus, Globe2, Download, ChevronDown, X, FileText, FileSpreadsheet, FileType } from "lucide-react";
import { deleteDaySessionsAction, duplicateDayAction, duplicateAcrossCircuitAction } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { exportScheduleAsCsv, exportScheduleAsXlsx, exportScheduleAsPdf, exportScheduleAsWord } from "@/lib/schedule-export";
import type { ScheduleRoom } from "@/components/admin/scheduling-day-view";

type BranchOption = { id: string; name: string };

export function SchedulingToolbar({
  rooms,
  auditoriumIds,
  dayStartISO,
  dayEndISO,
  branches,
  currentBranchId,
  isCircuitAdmin,
}: {
  rooms: ScheduleRoom[];
  auditoriumIds: string[];
  dayStartISO: string;
  dayEndISO: string;
  branches: BranchOption[];
  currentBranchId?: string;
  isCircuitAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [targetDate, setTargetDate] = useState("");
  const [circuitOpen, setCircuitOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [fromBranchId, setFromBranchId] = useState(currentBranchId ?? "");
  const [toBranchId, setToBranchId] = useState("");
  const [fromDate, setFromDate] = useState(dayStartISO.slice(0, 10));
  const [toDate, setToDate] = useState("");

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

  function handleDuplicateAcrossCircuit() {
    if (!fromBranchId || !toBranchId) {
      toast.error("Select cinema to duplicate to.");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Select the dates to duplicate from and to.");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("Choose two different cinemas.");
      return;
    }
    startTransition(async () => {
      try {
        const { created, skipped } = await duplicateAcrossCircuitAction(
          fromBranchId,
          toBranchId,
          new Date(`${fromDate}T00:00:00`).toISOString(),
          new Date(`${toDate}T00:00:00`).toISOString()
        );
        toast.success(`Duplicated ${created} session${created === 1 ? "" : "s"}.${skipped > 0 ? ` ${skipped} skipped (no matching room/time).` : ""}`);
        setCircuitOpen(false);
        setToBranchId("");
        setToDate("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to duplicate sessions across the circuit.");
      }
    });
  }

  function getExportRows() {
    return rooms.flatMap((r) =>
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
  }

  function handleDownload(kind: "csv" | "xlsx" | "pdf" | "word") {
    const rows = getExportRows();
    if (rows.length === 0) {
      toast.error("No sessions to download for this day.");
      return;
    }
    const filenameBase = `schedule-${dayStartISO.slice(0, 10)}`;
    const title = `Schedule — ${dayStartISO.slice(0, 10)}`;
    setDownloadOpen(false);

    startTransition(async () => {
      try {
        if (kind === "csv") exportScheduleAsCsv(rows, filenameBase);
        else if (kind === "xlsx") await exportScheduleAsXlsx(rows, filenameBase);
        else if (kind === "pdf") await exportScheduleAsPdf(rows, filenameBase, title);
        else await exportScheduleAsWord(rows, filenameBase, title);
      } catch {
        toast.error("Couldn't generate that file. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="danger" size="sm" disabled={isPending} onClick={handleDeleteAll}>
        <Trash2 size={14} /> Delete Sessions
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setDuplicateOpen(true)}>
        <CopyPlus size={14} /> Duplicate Sessions
      </Button>
      {isCircuitAdmin && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setCircuitOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-gold px-3 py-1.5 text-sm font-medium text-black hover:brightness-95 disabled:opacity-50"
        >
          <Globe2 size={14} /> Duplicate Sessions Across Circuit
        </button>
      )}

      <div className="relative">
        <Button variant="secondary" size="sm" onClick={() => setDownloadOpen((v) => !v)}>
          <Download size={14} /> Download Session <ChevronDown size={12} />
        </Button>
        {downloadOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
            <div className="absolute left-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <FileText size={14} /> PDF
              </button>
              <button
                type="button"
                onClick={() => handleDownload("csv")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <FileSpreadsheet size={14} /> CSV
              </button>
              <button
                type="button"
                onClick={() => handleDownload("xlsx")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <FileSpreadsheet size={14} /> XLSX
              </button>
              <button
                type="button"
                onClick={() => handleDownload("word")}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                <FileType size={14} /> Word
              </button>
            </div>
          </>
        )}
      </div>

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

      {circuitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCircuitOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Duplicate Session Across Circuit</h3>
              <button onClick={() => setCircuitOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">Select Cinema To Duplicate From</label>
                <Select value={fromBranchId} onChange={(e) => setFromBranchId(e.target.value)}>
                  <option value="">Select cinema</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">Select Day To Duplicate From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">Cinema To Duplicate To</label>
                <Select value={toBranchId} onChange={(e) => setToBranchId(e.target.value)}>
                  <option value="">Select cinema</option>
                  {branches
                    .filter((b) => b.id !== fromBranchId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                </Select>
                {!toBranchId && <p className="mt-1 text-xs text-danger">Select cinema to duplicate to</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/90">Select Day To Duplicate To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                {!toDate && <p className="mt-1 text-xs text-danger">Select date to duplicate to</p>}
              </div>
            </div>

            <Button className="mt-5 w-full" disabled={isPending} onClick={handleDuplicateAcrossCircuit}>
              {isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
