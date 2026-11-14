"use client";

import { useEffect, useState } from "react";
import StarRating from "@/components/products/StarRating";
import type { ReviewDTO } from "@/lib/data/reviews";

interface ReviewsApiData {
  reviews: ReviewDTO[];
  total: number;
  totalPages: number;
  page: number;
}

/**
 * Self-fetches from the public reviews API rather than being server-fed by
 * the product page. Reviews sit below the fold and newly-submitted reviews
 * are unapproved until moderated anyway, so there's no correctness reason
 * to server-render this — keeping it self-contained avoids threading
 * pagination state back up through the page/ProductInfo tree.
 */
export default function ReviewList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/reviews/product/${productId}?page=1`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (!json.success) {
          setError(json.error || "Couldn't load reviews.");
          return;
        }
        const data: ReviewsApiData = json.data;
        setReviews(data.reviews);
        setPage(data.page);
        setTotalPages(data.totalPages);
      })
      .catch(() => {
        if (active) setError("Network error. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/product/${productId}?page=${page + 1}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Couldn't load more reviews.");
        return;
      }
      const data: ReviewsApiData = json.data;
      setReviews((prev) => [...prev, ...data.reviews]);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && reviews.length === 0) {
    return <p className="text-sm text-ink-500">Loading reviews…</p>;
  }

  if (error && reviews.length === 0) {
    return <p className="text-sm text-clay">{error}</p>;
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-ink-500">No reviews yet — be the first to review this product.</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((r) => (
        <div key={r.id} className="border-b border-ink-100 pb-6">
          <div className="flex items-center gap-2">
            <StarRating rating={r.rating} />
            {r.isVerified && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-sage-600">Verified Purchase</span>
            )}
          </div>
          {r.title && <p className="mt-2 text-sm font-medium text-ink">{r.title}</p>}
          {r.comment && <p className="mt-1 text-sm leading-relaxed text-ink-500">{r.comment}</p>}
          <p className="mt-2 text-xs text-ink-300">
            {r.customerName} ·{" "}
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(r.createdAt))}
          </p>
        </div>
      ))}

      {page < totalPages && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="text-sm text-brass-600 hover:underline disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more reviews"}
        </button>
      )}
    </div>
  );
}
