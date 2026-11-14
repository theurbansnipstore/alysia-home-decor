"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import Button from "@/components/ui/Button";
import StarRating from "@/components/products/StarRating";

interface ExistingReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
}

interface ReviewFormProps {
  productId: string;
  isAuthenticated: boolean;
  existingReview: ExistingReview | null;
}

/**
 * Write-once: a customer with an existing review sees a read-only
 * thank-you summary, never an edit form (customer-facing editing was
 * removed by design — see PATCH removal in /api/reviews/[id]). Moderation
 * status (isApproved) is deliberately never surfaced here; it's an
 * internal/admin concern only.
 */
export default function ReviewForm({ productId, isAuthenticated, existingReview }: ReviewFormProps) {
  const [review, setReview] = useState(existingReview);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <div className="border border-ink-100 bg-bone p-6 text-sm text-ink-500">
        <Link href="/login" className="text-brass-600 hover:underline">
          Sign in
        </Link>{" "}
        to write a review.
      </div>
    );
  }

  if (review) {
    return (
      <div className="border border-ink-100 bg-bone p-6">
        <h3 className="font-display text-lg text-ink">Thank you for your review!</h3>
        <p className="mt-1 text-xs text-ink-500">We appreciate you sharing your experience.</p>
        <div className="mt-4 border-t border-ink-100 pt-4">
          <StarRating rating={review.rating} />
          {review.title && <p className="mt-2 text-sm font-medium text-ink">{review.title}</p>}
          {review.comment && <p className="mt-1 text-sm leading-relaxed text-ink-500">{review.comment}</p>}
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    setBusy(true);
    try {
      const trimmedTitle = title.trim() || undefined;
      const trimmedComment = comment.trim() || undefined;

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title: trimmedTitle, comment: trimmedComment }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't submit your review. Please try again.");
        return;
      }

      setReview({ id: json.data.id, rating, title: trimmedTitle ?? null, comment: trimmedComment ?? null });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-ink-100 bg-bone p-6">
      <h3 className="font-display text-lg text-ink">Write a review</h3>

      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === rating}
            aria-label={`${s} star${s === 1 ? "" : "s"}`}
            onClick={() => setRating(s)}
            className="text-brass transition-transform hover:scale-110"
          >
            <Star size={22} fill={s <= rating ? "currentColor" : "none"} strokeWidth={s <= rating ? 0 : 1.5} />
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={120}
        className="mt-4 w-full border border-ink-100 px-3 py-2 text-sm"
      />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts about this product (optional)"
        maxLength={2000}
        rows={4}
        className="mt-3 w-full border border-ink-100 px-3 py-2 text-sm"
      />

      {error && (
        <p role="alert" className="mt-3 text-xs text-clay">
          {error}
        </p>
      )}

      <div className="mt-4">
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Submitting…" : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}
