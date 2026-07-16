"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction, type ReviewFormState } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function ReviewForm({ movieId }: { movieId: string }) {
  const [state, formAction, isPending] = useActionState<ReviewFormState, FormData>(submitReviewAction, null);
  const [rating, setRating] = useState(5);

  if (state?.success) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
        Thanks! Your review has been submitted and will appear once our team approves it.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <input type="hidden" name="movieId" value={movieId} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <p className="mb-1.5 text-sm font-medium">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`}>
              <Star size={22} className={cn(i <= rating ? "fill-accent-gold text-accent-gold" : "text-border")} />
            </button>
          ))}
        </div>
      </div>

      <Textarea name="comment" rows={3} placeholder="Share your thoughts about this movie..." required minLength={10} />

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
