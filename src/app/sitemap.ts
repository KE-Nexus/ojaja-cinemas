import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://ojaja.reachcinema.io";
  const movies = await prisma.movie.findMany({ select: { slug: true, releaseDate: true } });

  const staticRoutes = [
    "",
    "/movies",
    "/showtimes",
    "/locations",
    "/book-a-space",
    "/contact",
    "/house-rules",
    "/policies/terms",
    "/policies/privacy",
    "/policies/refunds",
  ].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));

  const movieRoutes = movies.map((m) => ({ url: `${base}/movies/${m.slug}`, lastModified: m.releaseDate }));

  return [...staticRoutes, ...movieRoutes];
}
