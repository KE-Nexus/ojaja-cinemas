"use client";

import { useActionState } from "react";
import { createMovieAction, updateMovieAction, type FormState } from "@/actions/admin/movies";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/input";
import type { Movie } from "@prisma/client";

export function MovieForm({ movie }: { movie?: Movie }) {
  const action = movie ? updateMovieAction : createMovieAction;
  const [state, formAction, isPending] = useActionState<FormState, FormData>(action, null);

  const dateValue = movie ? new Date(movie.releaseDate).toISOString().slice(0, 10) : "";

  return (
    <form action={formAction} className="space-y-4">
      {movie && <input type="hidden" name="id" value={movie.id} />}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={movie?.title} required />
      </div>

      <div>
        <Label htmlFor="synopsis">Synopsis</Label>
        <Textarea id="synopsis" name="synopsis" rows={3} defaultValue={movie?.synopsis} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="posterUrl">Poster URL</Label>
          <Input id="posterUrl" name="posterUrl" defaultValue={movie?.posterUrl} required />
        </div>
        <div>
          <Label htmlFor="backdropUrl">Backdrop URL (optional)</Label>
          <Input id="backdropUrl" name="backdropUrl" defaultValue={movie?.backdropUrl ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="trailerUrl">Trailer embed URL (optional)</Label>
        <Input id="trailerUrl" name="trailerUrl" defaultValue={movie?.trailerUrl ?? ""} placeholder="https://www.youtube.com/embed/..." />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="genres">Genres</Label>
          <Input id="genres" name="genres" defaultValue={movie?.genres} placeholder="Drama, Thriller" required />
        </div>
        <div>
          <Label htmlFor="classification">Classification</Label>
          <Input id="classification" name="classification" defaultValue={movie?.classification} placeholder="15" required />
        </div>
        <div>
          <Label htmlFor="language">Language</Label>
          <Input id="language" name="language" defaultValue={movie?.language} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="runtimeMins">Runtime (mins)</Label>
          <Input id="runtimeMins" name="runtimeMins" type="number" min={1} defaultValue={movie?.runtimeMins} required />
        </div>
        <div>
          <Label htmlFor="releaseDate">Release date</Label>
          <Input id="releaseDate" name="releaseDate" type="date" defaultValue={dateValue} required />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={movie?.status ?? "COMING_SOON"}>
            <option value="NOW_SHOWING">Now Showing</option>
            <option value="COMING_SOON">Coming Soon</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cast">Cast</Label>
          <Input id="cast" name="cast" defaultValue={movie?.cast} required />
        </div>
        <div>
          <Label htmlFor="director">Director</Label>
          <Input id="director" name="director" defaultValue={movie?.director ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="distributor">Distributor</Label>
        <Input id="distributor" name="distributor" defaultValue={movie?.distributor ?? ""} placeholder="e.g. Universal Pictures" />
      </div>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : movie ? "Save Changes" : "Create Movie"}
      </Button>
    </form>
  );
}
