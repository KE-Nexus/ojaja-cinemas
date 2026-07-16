import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteMovieAction } from "@/actions/admin/movies";

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const movies = await prisma.movie.findMany({
    where: query ? { title: { contains: query } } : undefined,
    orderBy: { releaseDate: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight">Movies</h1>
          <p className="text-sm text-muted">
            {movies.length} title{movies.length === 1 ? "" : "s"}
            {query && ` matching "${query}"`}
          </p>
        </div>
        <Button href="/admin/movies/import">
          <Plus size={16} /> Import Movies
        </Button>
      </div>

      <form method="get" className="mb-6 max-w-sm">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={query} placeholder="Search movies by title..." className="pl-9" />
        </div>
      </form>

      {movies.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          {query ? `No movies match "${query}".` : "No movies in the catalog yet."}
        </p>
      ) : (
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="p-3 font-medium">Movie</th>
              <th className="p-3 font-medium">Genres</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Release</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <tr key={m.id} className="border-b border-border/50">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded">
                      <Image src={m.posterUrl} alt={m.title} fill className="object-cover" />
                    </div>
                    <span className="font-medium">{m.title}</span>
                  </div>
                </td>
                <td className="p-3 text-muted">{m.genres}</td>
                <td className="p-3">
                  <Badge tone={m.status === "NOW_SHOWING" ? "success" : m.status === "COMING_SOON" ? "gold" : "neutral"}>
                    {m.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="p-3 text-muted">{new Date(m.releaseDate).toLocaleDateString("en-NG")}</td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/movies/${m.id}/edit`} className="text-muted hover:text-brand-light">
                      <Pencil size={15} />
                    </Link>
                    <DeleteButton action={deleteMovieAction.bind(null, m.id)} confirmText={`Delete "${m.title}"? This cannot be undone.`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
