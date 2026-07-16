import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/rating-stars";
import { ReviewActions } from "@/components/admin/review-actions";

const STATUS_TONE = { PENDING: "gold", APPROVED: "success", REJECTED: "danger" } as const;

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    include: { movie: true, user: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div>
      <h1 className="font-sans text-2xl font-bold tracking-tight">Reviews</h1>
      <p className="mb-6 text-sm text-muted">Moderate customer reviews before they go live.</p>

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.movie.title}</span>
                <span className="text-xs text-muted">by {r.user.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <RatingStars rating={r.rating} size={14} />
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
            </div>
            <p className="text-sm text-foreground/85">{r.comment}</p>
            {r.status === "PENDING" && (
              <div className="mt-3">
                <ReviewActions reviewId={r.id} />
              </div>
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-muted">No reviews yet.</p>}
      </div>
    </div>
  );
}
