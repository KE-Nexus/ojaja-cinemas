"use client";

import { useActionState, useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSessionAction, type SessionFormState } from "@/actions/admin/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";

type Movie = { id: string; title: string };
type Room = { id: string; name: string };

export function CreateSessionModal({
  movies,
  rooms,
  defaultDate,
}: {
  movies: Movie[];
  rooms: Room[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<SessionFormState, FormData>(createSessionAction, null);

  useEffect(() => {
    if (state?.success) {
      toast.success("Session created.");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the modal is a one-time reaction to the action result, not a render loop
      setOpen(false);
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} /> Create Session
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Create Session</h3>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form action={formAction} className="space-y-3">
              <div>
                <Label htmlFor="movieId">Movie</Label>
                <Select id="movieId" name="movieId" required defaultValue="">
                  <option value="" disabled>
                    Select a movie
                  </option>
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="auditoriumId">Room</Label>
                <Select id="auditoriumId" name="auditoriumId" required defaultValue="">
                  <option value="" disabled>
                    Select a room
                  </option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="startTime">Start time</Label>
                <Input id="startTime" name="startTime" type="datetime-local" defaultValue={defaultDate} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="basePrice">Base price (₦)</Label>
                  <Input id="basePrice" name="basePrice" type="number" min={100} step={50} defaultValue={3500} required />
                </div>
                <div>
                  <Label htmlFor="format">Format</Label>
                  <Select id="format" name="format" defaultValue="2D">
                    <option>2D</option>
                    <option>3D</option>
                    <option>IMAX</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="language">Language</Label>
                <Input id="language" name="language" defaultValue="English" required />
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating..." : "Create Session"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
