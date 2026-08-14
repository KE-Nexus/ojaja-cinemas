"use client";

import { useActionState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { updateFilmSessionAction, type SessionFormState } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { toDatetimeLocal } from "@/components/admin/create-film-sessions-modal";
import type { ScheduleSession } from "@/components/admin/scheduling-day-view";

const SCREEN_FORMATS = ["Standard 2D", "Standard 3D", "IMAX 2D", "IMAX 3D", "4DX"];
const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French"];

export function EditSessionModal({
  session,
  movies,
  rooms,
  priceCards,
  onClose,
  onSaved,
}: {
  session: ScheduleSession;
  movies: { id: string; title: string }[];
  rooms: { id: string; name: string }[];
  priceCards: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, formAction, isPending] = useActionState<SessionFormState, FormData>(updateFilmSessionAction, null);
  const lastHandled = useRef<SessionFormState>(null);

  useEffect(() => {
    if (state?.success && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.success("Session updated.");
      onSaved();
    } else if (state?.error && state !== lastHandled.current) {
      lastHandled.current = state;
      toast.error(state.error);
    }
  }, [state, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-semibold">Edit Session</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            <input type="hidden" name="id" value={session.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="movieId">Select Film</Label>
                <Select id="movieId" name="movieId" required defaultValue={session.movieId}>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Select Status</Label>
                <Select id="status" name="status" defaultValue={session.status}>
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="language">Select Language</Label>
              <Select id="language" name="language" defaultValue={session.language}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="auditoriumId">Choose Screen</Label>
                <Select id="auditoriumId" name="auditoriumId" required defaultValue={session.auditoriumId}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="priceCardId">Choose Price Card</Label>
                <Select id="priceCardId" name="priceCardId" defaultValue={session.priceCardId ?? ""}>
                  <option value="">Select Price Card</option>
                  {priceCards.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="format">Choose Screen Format</Label>
                <Select id="format" name="format" defaultValue={session.format}>
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
                <Label htmlFor="trailerDurationMins">Trailer Duration (Mins)</Label>
                <Input id="trailerDurationMins" name="trailerDurationMins" type="number" min={0} step={1} defaultValue={session.trailerDurationMins} />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(new Date(session.startTime))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  defaultValue={session.endTime ? toDatetimeLocal(new Date(session.endTime)) : ""}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="cleanupTimeMins">Cleanup Time (Mins)</Label>
                <Input id="cleanupTimeMins" name="cleanupTimeMins" type="number" min={0} step={1} defaultValue={session.cleanupTimeMins} />
              </div>
              <div>
                <Label>Sell On</Label>
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-2/80 px-3.5 py-2.5 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="salesOnPos" value="true" defaultChecked={session.salesOnPos} className="accent-brand" />
                    POS
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" name="salesOnWeb" value="true" defaultChecked={session.salesOnWeb} className="accent-brand" />
                    Web
                  </label>
                </div>
              </div>
            </div>

            {state?.error && <FieldError>{state.error}</FieldError>}
          </div>

          <div className="border-t border-border p-4">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
