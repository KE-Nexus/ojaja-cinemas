"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createFilmSessionsAction, type SessionFormState } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

type Movie = { id: string; title: string; runtimeMins: number };
type Room = { id: string; name: string };
type PriceCardOption = { id: string; name: string };
type Branch = { id: string; name: string };

const SCREEN_FORMATS = ["Standard 2D", "Standard 3D", "IMAX 2D", "IMAX 3D", "4DX"];

type Row = { key: number };

// datetime-local inputs read/write "YYYY-MM-DDTHH:mm" in the browser's local time —
// deliberately not using toISOString(), which would convert to UTC and shift the
// displayed time in any timezone other than UTC.
export function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeEndTime(startTime: string, runtimeMins: number, trailerMins: number): string {
  if (!startTime) return "";
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + (runtimeMins + trailerMins) * 60000);
  return toDatetimeLocal(end);
}

function SessionRow({
  rowKey,
  rooms,
  priceCards,
  defaultStartTime,
  defaultAuditoriumId,
  runtimeMins,
  onRemove,
  removable,
}: {
  rowKey: number;
  rooms: Room[];
  priceCards: PriceCardOption[];
  defaultStartTime: string;
  defaultAuditoriumId?: string;
  runtimeMins: number;
  onRemove: () => void;
  removable: boolean;
}) {
  const [trailerMins, setTrailerMins] = useState(0);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(() => computeEndTime(defaultStartTime, runtimeMins, 0));

  // Recompute End Time when the selected film (and therefore its runtime) changes after
  // this row was already added — adjusting state during render, not in an effect, is the
  // sanctioned way to sync from a prop change without an extra render round-trip.
  const [prevRuntimeMins, setPrevRuntimeMins] = useState(runtimeMins);
  if (prevRuntimeMins !== runtimeMins) {
    setPrevRuntimeMins(runtimeMins);
    setEndTime(computeEndTime(startTime, runtimeMins, trailerMins));
  }

  return (
    <div className="relative space-y-3 rounded-lg border border-border p-4">
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove session"
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white hover:brightness-110"
        >
          <XCircle size={16} />
        </button>
      )}

      {/* Unchecked checkboxes submit nothing, which would desync this row's position from
          the other row_* arrays (all always-present text/select fields) — row_key gives the
          server a stable per-row id to look the channel checkboxes up by instead of by index. */}
      <input type="hidden" name="row_key" value={rowKey} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`auditoriumId-${rowKey}`}>Choose Screen</Label>
          <Select id={`auditoriumId-${rowKey}`} name="row_auditoriumId" required defaultValue={defaultAuditoriumId ?? ""}>
            <option value="" disabled>
              Select Screen
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`priceCardId-${rowKey}`}>Choose Price Card</Label>
          <Select id={`priceCardId-${rowKey}`} name="row_priceCardId" defaultValue="">
            <option value="">Select Price Card</option>
            {priceCards.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`format-${rowKey}`}>Choose Screen Format</Label>
          <Select id={`format-${rowKey}`} name="row_format" defaultValue={SCREEN_FORMATS[0]}>
            {SCREEN_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`trailer-${rowKey}`}>Trailer Duration (Mins)</Label>
          <Input
            id={`trailer-${rowKey}`}
            name="row_trailerDurationMins"
            type="number"
            min={0}
            step={1}
            value={trailerMins}
            onChange={(e) => {
              const mins = Math.max(0, Number(e.currentTarget.value) || 0);
              setTrailerMins(mins);
              setEndTime(computeEndTime(startTime, runtimeMins, mins));
            }}
          />
        </div>
        <div>
          <Label htmlFor={`start-${rowKey}`}>Start Time</Label>
          <Input
            id={`start-${rowKey}`}
            name="row_startTime"
            type="datetime-local"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.currentTarget.value);
              setEndTime(computeEndTime(e.currentTarget.value, runtimeMins, trailerMins));
            }}
            required
          />
        </div>
        <div>
          <Label htmlFor={`end-${rowKey}`}>End Time</Label>
          <Input
            id={`end-${rowKey}`}
            name="row_endTime"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.currentTarget.value)}
          />
          <p className="mt-1 text-xs text-muted">Auto-filled from the film&rsquo;s runtime — adjust if needed.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`cleanup-${rowKey}`}>Cleanup Time (Mins)</Label>
          <Input id={`cleanup-${rowKey}`} name="row_cleanupTimeMins" type="number" min={0} step={1} defaultValue={0} />
        </div>
        <div>
          <Label>Sell On</Label>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name={`row_salesOnPos_${rowKey}`} value="true" defaultChecked className="accent-brand" />
              POS
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" name={`row_salesOnWeb_${rowKey}`} value="true" defaultChecked className="accent-brand" />
              Web
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export type SessionPrefill = { auditoriumId?: string; startTime?: string } | null;

export function CreateFilmSessionsModal({
  open,
  onOpenChange,
  movies,
  rooms,
  priceCards,
  branches,
  languages,
  defaultBranchId,
  defaultDate,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movies: Movie[];
  rooms: Room[];
  priceCards: PriceCardOption[];
  branches: Branch[];
  languages: { id: string; name: string }[];
  defaultBranchId?: string;
  defaultDate: string;
  prefill?: SessionPrefill;
}) {
  const [state, formAction, isPending] = useActionState<SessionFormState, FormData>(createFilmSessionsAction, null);
  const [rows, setRows] = useState<Row[]>([{ key: 0 }]);
  const [movieId, setMovieId] = useState("");
  const [nextKey, setNextKey] = useState(1);
  const lastHandled = useRef<SessionFormState>(null);
  const selectedRuntimeMins = movies.find((m) => m.id === movieId)?.runtimeMins ?? 0;

  // Reset the form fresh every time the modal opens — adjusting state during render off a
  // prop change, rather than in an effect, avoids an extra render round-trip.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setRows([{ key: 0 }]);
      setNextKey(1);
      setMovieId("");
    }
  }

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Session(s) created.");
      onOpenChange(false);
    } else if (state?.error && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => onOpenChange(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-semibold">Create Film Session(s)</h3>
              <button onClick={() => onOpenChange(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-4 p-5">
                <div>
                  <Label htmlFor="branchId">Select Cinema</Label>
                  <Select id="branchId" name="branchId" defaultValue={defaultBranchId} required>
                    <option value="">Select a cinema</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="movieId">Select Film</Label>
                    <Select id="movieId" name="movieId" required value={movieId} onChange={(e) => setMovieId(e.currentTarget.value)}>
                      <option value="" disabled>
                        Select Film
                      </option>
                      {movies.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Select Status</Label>
                    <Select id="status" name="status" defaultValue="OPEN">
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="language">Select Language</Label>
                  <Select id="language" name="language" defaultValue={languages[0]?.name ?? ""}>
                    {languages.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-sm font-semibold">Add Session</p>
                  <div className="space-y-4">
                    {rows.map((row, i) => (
                      <SessionRow
                        key={row.key}
                        rowKey={row.key}
                        rooms={rooms}
                        priceCards={priceCards}
                        defaultStartTime={(i === 0 && prefill?.startTime) || defaultDate}
                        defaultAuditoriumId={i === 0 ? prefill?.auditoriumId : undefined}
                        runtimeMins={selectedRuntimeMins}
                        removable={rows.length > 1}
                        onRemove={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((r) => [...r, { key: nextKey }]);
                      setNextKey((k) => k + 1);
                    }}
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-brand/50"
                  >
                    <Plus size={14} /> Add Session
                  </button>
                </div>

                {state?.error && <FieldError>{state.error}</FieldError>}
              </div>

              <div className="border-t border-border p-4">
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
