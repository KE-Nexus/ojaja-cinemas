"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, CopyPlus, Send, Download, X } from "lucide-react";
import { createRosterShiftAction, duplicateRosterWeekAction, sendRosterAction, type FormState } from "@/actions/admin/roster";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

type StaffOption = { id: string; name: string };
type RosterRow = { staffName: string; day: string; shift: string };

export function RosterToolbar({
  branchId,
  weekStartISO,
  staffOptions,
  csvRows,
}: {
  branchId: string;
  weekStartISO: string;
  staffOptions: StaffOption[];
  csvRows: RosterRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState("");
  const [createState, createAction, isCreating] = useActionState<FormState, FormData>(createRosterShiftAction, null);
  const lastHandled = useRef<FormState>(null);

  useEffect(() => {
    if (createState?.success && createState !== lastHandled.current) {
      lastHandled.current = createState;
      toast.success("Shift added.");
      setCreateOpen(false);
    }
  }, [createState]);

  function handleDuplicate() {
    if (!targetWeek) {
      toast.error("Pick a target week first.");
      return;
    }
    startTransition(async () => {
      try {
        const created = await duplicateRosterWeekAction(branchId, weekStartISO, new Date(targetWeek).toISOString());
        toast.success(`Duplicated ${created} shift${created === 1 ? "" : "s"} to that week.`);
        setDuplicateOpen(false);
        setTargetWeek("");
      } catch {
        toast.error("Failed to duplicate roster.");
      }
    });
  }

  function handleSend() {
    startTransition(async () => {
      try {
        const count = await sendRosterAction(branchId, weekStartISO);
        toast.success(count > 0 ? `Roster sent to ${count} staff member${count === 1 ? "" : "s"}.` : "No shifts scheduled this week.");
      } catch {
        toast.error("Failed to send roster.");
      }
    });
  }

  function handleDownload() {
    if (csvRows.length === 0) {
      toast.error("No shifts to download for this week.");
      return;
    }
    const header = ["Staff", "Day", "Shift"];
    const csv = [header.join(","), ...csvRows.map((r) => [`"${r.staffName}"`, r.day, r.shift].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roster-${weekStartISO.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={staffOptions.length === 0} onClick={() => setCreateOpen(true)}>
        <Plus size={14} /> Create Roster
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setDuplicateOpen(true)}>
        <CopyPlus size={14} /> Duplicate Roster
      </Button>
      <Button variant="secondary" size="sm" disabled={isPending} onClick={handleSend}>
        <Send size={14} /> Send Roster
      </Button>
      <Button variant="secondary" size="sm" onClick={handleDownload}>
        <Download size={14} /> Download Roster
      </Button>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Create Roster Shift</h3>
              <button onClick={() => setCreateOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form action={createAction} className="space-y-3">
              <input type="hidden" name="branchId" value={branchId} />
              <div>
                <Label htmlFor="staffId">Staff</Label>
                <Select id="staffId" name="staffId" defaultValue="" required>
                  <option value="" disabled>
                    Select staff
                  </option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startTime">Start</Label>
                  <Input id="startTime" name="startTime" type="time" defaultValue="10:00" required />
                </div>
                <div>
                  <Label htmlFor="endTime">End</Label>
                  <Input id="endTime" name="endTime" type="time" defaultValue="18:00" required />
                </div>
              </div>

              {createState?.error && <FieldError>{createState.error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Saving..." : "Add Shift"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {duplicateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDuplicateOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Duplicate Roster To</h3>
              <button onClick={() => setDuplicateOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-muted">Pick any date in the target week — copies every shift this week to that week.</p>
            <Input type="date" value={targetWeek} onChange={(e) => setTargetWeek(e.target.value)} />
            <Button className="mt-4 w-full" disabled={isPending} onClick={handleDuplicate}>
              {isPending ? "Duplicating..." : "Duplicate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
