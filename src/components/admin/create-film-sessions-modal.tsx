"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { createFilmSessionsAction, type SessionFormState } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

type Movie = { id: string; title: string };
type Room = { id: string; name: string };
type PriceCardOption = { id: string; name: string };
type Branch = { id: string; name: string };

const SCREEN_FORMATS = ["Standard 2D", "Standard 3D", "IMAX 2D", "IMAX 3D", "4DX"];
const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French"];

type Row = { key: number };

function SessionRow({
  rowKey,
  rooms,
  priceCards,
  defaultStartTime,
  onRemove,
  removable,
}: {
  rowKey: number;
  rooms: Room[];
  priceCards: PriceCardOption[];
  defaultStartTime: string;
  onRemove: () => void;
  removable: boolean;
}) {
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

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`auditoriumId-${rowKey}`}>Choose Screen</Label>
          <Select id={`auditoriumId-${rowKey}`} name="row_auditoriumId" required defaultValue="">
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
          <Input id={`trailer-${rowKey}`} name="row_trailerDurationMins" type="number" min={0} step={1} defaultValue={0} />
        </div>
        <div>
          <Label htmlFor={`start-${rowKey}`}>Start Time</Label>
          <Input id={`start-${rowKey}`} name="row_startTime" type="datetime-local" defaultValue={defaultStartTime} required />
        </div>
        <div>
          <Label htmlFor={`end-${rowKey}`}>End Time</Label>
          <Input id={`end-${rowKey}`} name="row_endTime" type="datetime-local" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`cleanup-${rowKey}`}>Cleanup Time (Mins)</Label>
          <Input id={`cleanup-${rowKey}`} name="row_cleanupTimeMins" type="number" min={0} step={1} defaultValue={0} />
        </div>
      </div>
    </div>
  );
}

export function CreateFilmSessionsModal({
  movies,
  rooms,
  priceCards,
  branches,
  defaultBranchId,
  defaultDate,
}: {
  movies: Movie[];
  rooms: Room[];
  priceCards: PriceCardOption[];
  branches: Branch[];
  defaultBranchId?: string;
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<SessionFormState, FormData>(createFilmSessionsAction, null);
  const [rows, setRows] = useState<Row[]>([{ key: 0 }]);
  const nextKey = useRef(1);
  const lastHandled = useRef<SessionFormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Session(s) created.");
      setOpen(false);
    } else if (state?.error && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.error(state.error);
    }
  }, [state]);

  return (
    <>
      <Button
        onClick={() => {
          setRows([{ key: 0 }]);
          nextKey.current = 1;
          setOpen(true);
        }}
      >
        <Plus size={16} /> Create Session
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="font-semibold">Create Film Session(s)</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
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
                    <Select id="movieId" name="movieId" required defaultValue="">
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
                  <Select id="language" name="language" defaultValue={LANGUAGES[0]}>
                    {LANGUAGES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-3 text-sm font-semibold">Add Session</p>
                  <div className="space-y-4">
                    {rows.map((row) => (
                      <SessionRow
                        key={row.key}
                        rowKey={row.key}
                        rooms={rooms}
                        priceCards={priceCards}
                        defaultStartTime={defaultDate}
                        removable={rows.length > 1}
                        onRemove={() => setRows((r) => r.filter((x) => x.key !== row.key))}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((r) => [...r, { key: nextKey.current }]);
                      nextKey.current += 1;
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
