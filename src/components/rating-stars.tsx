import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function RatingStars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(i <= Math.round(rating) ? "fill-accent-gold text-accent-gold" : "text-border")}
        />
      ))}
    </div>
  );
}
