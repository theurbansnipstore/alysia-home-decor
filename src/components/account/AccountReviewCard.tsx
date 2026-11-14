"use client";

import { useState } from "react";
import Link from "next/link";
import StarRating from "@/components/products/StarRating";
import type { AccountReviewDTO } from "@/lib/data/reviews";

/**
 * Customer-facing only — deliberately never renders review.isApproved.
 * Moderation status is an internal/admin concern (see /admin/reviews);
 * customers just see what they submitted. No edit action either —
 * editing was removed by design, customers may only view or delete.
 */
export default function AccountReviewCard({ review }: { review: AccountReviewDTO }) {
  const [deleted, setDeleted] = useState(false);
  const [busy, setBusy] = useState(false);

  if (deleted) return null;

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok && json.success) setDeleted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-ink-100 bg-bone p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/product/${review.productSlug}`} className="text-sm font-medium text-ink hover:text-brass-600">
            {review.productName}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StarRating rating={review.rating} />
            {review.isVerified && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-sage-600">Verified Purchase</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="text-xs text-clay hover:underline disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
      {review.title && <p className="mt-3 text-sm font-medium text-ink">{review.title}</p>}
      {review.comment && <p className="mt-1 text-sm leading-relaxed text-ink-500">{review.comment}</p>}
      <p className="mt-2 text-xs text-ink-300">
        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(review.createdAt))}
      </p>
    </div>
  );
}
