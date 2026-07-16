import { Ticket, PartyPopper, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { MovieCardData } from "@/components/movie-card";
import { MovieRow } from "@/components/movie-row";
import { MovieGrid } from "@/components/movie-grid";
import { HeroCarousel, type HeroMovie } from "@/components/hero-carousel";
import { LocationsSection } from "@/components/locations-section";
import { Reveal } from "@/components/decor/reveal";
import { withRatings } from "@/lib/ratings";
import { nowShowingWhere } from "@/lib/movie-availability";
import { getSelectedLocationId } from "@/lib/location-session";

export default async function HomePage() {
  const locationId = await getSelectedLocationId();

  const [nowShowingRaw, comingSoonRaw, branchesRaw] = await Promise.all([
    prisma.movie.findMany({ where: nowShowingWhere(locationId), orderBy: { releaseDate: "desc" } }),
    prisma.movie.findMany({ where: { status: "COMING_SOON" }, orderBy: { releaseDate: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { auditoriums: true } } } }),
  ]);

  const [nowShowing, comingSoon] = await Promise.all([withRatings(nowShowingRaw), withRatings(comingSoonRaw)]);

  const heroMovies: HeroMovie[] = nowShowing.slice(0, 5).map((m) => ({
    slug: m.slug,
    title: m.title,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    genres: m.genres,
    runtimeMins: m.runtimeMins,
    classification: m.classification,
    synopsis: m.synopsis,
    rating: m.rating,
    reviewCount: m.reviewCount,
  }));

  const nowShowingCards: MovieCardData[] = nowShowing.map((m) => ({ ...m, synopsis: m.synopsis }));
  const comingSoonCards: MovieCardData[] = comingSoon.map((m) => ({ ...m, synopsis: m.synopsis }));

  // Group everything by primary genre for extra browsing rows, Netflix-style.
  const allCards = [...nowShowingCards, ...comingSoonCards];
  const byGenre = new Map<string, MovieCardData[]>();
  for (const movie of allCards) {
    const primaryGenre = movie.genres.split(",")[0]?.trim();
    if (!primaryGenre) continue;
    const list = byGenre.get(primaryGenre) ?? [];
    list.push(movie);
    byGenre.set(primaryGenre, list);
  }
  const genreRows = Array.from(byGenre.entries()).filter(([, movies]) => movies.length >= 3);

  const locations = branchesRaw.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    city: b.city,
    address: b.address,
    phone: b.phone,
    openingHours: b.openingHours,
    screenCount: b._count.auditoriums,
  }));

  return (
    <div>
      {heroMovies.length > 0 && <HeroCarousel movies={heroMovies} />}

      <div className={heroMovies.length > 0 ? "relative z-10 -mt-10 sm:-mt-16" : "relative z-10 pt-6"}>
        <MovieGrid title="Now Showing" movies={nowShowingCards} viewAllHref="/movies" />
        {comingSoonCards.length > 0 && (
          <MovieRow title="Coming Soon" movies={comingSoonCards} viewAllHref="/movies?status=coming-soon" />
        )}
        {genreRows.map(([genre, movies]) => (
          <MovieRow key={genre} title={genre} movies={movies} viewAllHref={`/movies?q=${encodeURIComponent(genre)}`} />
        ))}
      </div>

      <LocationsSection locations={locations} />

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 sm:grid-cols-3 lg:px-10">
          <Reveal>
            <Feature icon={<Ticket size={22} />} title="Seamless Booking" text="Pick your seats, grab concessions, and pay in minutes." />
          </Reveal>
          <Reveal delay={0.1}>
            <Feature icon={<PartyPopper size={22} />} title="Private Screenings" text="Host birthdays, premieres, and corporate events in our halls." />
          </Reveal>
          <Reveal delay={0.2}>
            <Feature icon={<ShieldCheck size={22} />} title="Secure Payments" text="Every booking is protected end-to-end, every time." />
          </Reveal>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15 text-brand-light">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}
