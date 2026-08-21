export type MovieCardData = {
  slug: string;
  title: string;
  posterUrl: string;
  genres: string;
  classification: string;
  runtimeMins: number;
  status: string;
  synopsis?: string;
  rating?: number | null;
  reviewCount?: number;
  releaseDate?: string | Date;
};
