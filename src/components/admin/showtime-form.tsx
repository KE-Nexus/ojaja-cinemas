"use client";

import { useActionState } from "react";
import { createShowtimeAction, type FormState } from "@/actions/admin/showtimes";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import type { Movie, Auditorium, Branch } from "@prisma/client";

export function ShowtimeForm({
  movies,
  auditoriums,
  languages,
}: {
  movies: Movie[];
  auditoriums: (Auditorium & { branch: Branch })[];
  languages: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createShowtimeAction, null);

  return (
    <form action={formAction} className="space-y-4">
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
        <Label htmlFor="auditoriumId">Auditorium</Label>
        <Select id="auditoriumId" name="auditoriumId" required defaultValue="">
          <option value="" disabled>
            Select an auditorium
          </option>
          {auditoriums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.branch.name} — {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startTime">Start time</Label>
          <Input id="startTime" name="startTime" type="datetime-local" required />
        </div>
        <div>
          <Label htmlFor="basePrice">Base price (₦)</Label>
          <Input id="basePrice" name="basePrice" type="number" min={100} step={50} defaultValue={3500} required />
        </div>
        <div>
          <Label htmlFor="language">Language</Label>
          <Select id="language" name="language" defaultValue={languages[0]?.name ?? ""} required>
            {languages.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </Select>
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

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Showtime"}
      </Button>
    </form>
  );
}
