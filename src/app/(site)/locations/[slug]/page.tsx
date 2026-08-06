import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CinemaHome, getScheduledMoviesForBranch } from "@/components/cinema-home";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const branch = await prisma.branch.findUnique({ where: { slug }, select: { name: true, city: true } });
  return { title: branch ? `${branch.name} | OJAJA Cinemas` : "Cinema" };
}

export default async function LocationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const branch = await prisma.branch.findUnique({
    where: { slug },
    include: {
      auditoriums: true,
      images: { orderBy: { position: "asc" } },
    },
  });
  if (!branch) notFound();

  const scheduledMovies = await getScheduledMoviesForBranch(branch);

  return <CinemaHome branch={branch} scheduledMovies={scheduledMovies} />;
}
