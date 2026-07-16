import { MovieForm } from "@/components/admin/movie-form";

export default function NewMoviePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight">Add Movie</h1>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <MovieForm />
      </div>
    </div>
  );
}
