import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CinemaHome, getScheduledMoviesForBranch } from "@/components/cinema-home";
import { getSelectedLocationId } from "@/lib/location-session";

export default async function HomePage() {
  // The (site) layout only ever renders this page once a location is selected —
  // it shows the LocationGate picker itself otherwise — so this is always set here.
  const locationId = await getSelectedLocationId();
  if (!locationId) notFound();

  const branch = await prisma.branch.findUnique({
    where: { id: locationId },
    include: {
      auditoriums: true,
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!branch) notFound();

  const scheduledMovies = await getScheduledMoviesForBranch(branch);

  return <CinemaHome branch={branch} scheduledMovies={scheduledMovies} />;
}
