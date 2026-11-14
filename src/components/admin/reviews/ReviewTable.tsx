"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/products/StarRating";
import type { AdminReviewDTO } from "@/lib/data/reviews";

export default function ReviewTable({
  reviews,
  disabledProductIds,
}: {
  reviews: AdminReviewDTO[];
  disabledProductIds: string[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setApproved(id: string, isApproved: boolean) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleProductReviews(productId: string, enabled: boolean) {
    setBusyId(`product-${productId}`);
    try {
      await fetch(`/api/admin/reviews/product-toggle/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (reviews.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No reviews match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Rating</th>
            <th className="px-4 py-3">Review</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Verified</th>
            <th className="px-4 py-3">Product Reviews</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {reviews.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 text-ink">{r.productName}</td>
              <td className="px-4 py-3 text-ink-500">
                {r.customerName}
                <div className="text-xs text-ink-300">{r.customerEmail}</div>
              </td>
              <td className="px-4 py-3">
                <StarRating rating={r.rating} />
              </td>
              <td className="max-w-xs px-4 py-3 text-ink-500">
                {r.title && <div className="font-medium text-ink-700">{r.title}</div>}
                <div className="line-clamp-2">{r.comment ?? "—"}</div>
              </td>
              <td className="px-4 py-3 text-ink-500">
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(r.createdAt))}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 text-xs ${r.isApproved ? "bg-green-100 text-green-800" : "bg-ink-100 text-ink-700"}`}>
                  {r.isApproved ? "Approved" : "Pending"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-500">{r.isVerified ? "Yes" : "—"}</td>
              <td className="px-4 py-3">
                {(() => {
                  const productEnabled = !disabledProductIds.includes(r.productId);
                  return (
                    <button
                      type="button"
                      disabled={busyId === `product-${r.productId}`}
                      onClick={() => toggleProductReviews(r.productId, !productEnabled)}
                      className={`text-xs hover:underline disabled:opacity-50 ${productEnabled ? "text-sage-600" : "text-clay"}`}
                      title={`Reviews are currently ${productEnabled ? "ON" : "OFF"} for ${r.productName}`}
                    >
                      {productEnabled ? "ON — turn off" : "OFF — turn on"}
                    </button>
                  );
                })()}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  {!r.isApproved && (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setApproved(r.id, true)}
                      className="text-brass-600 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {r.isApproved && (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setApproved(r.id, false)}
                      className="text-ink-700 hover:underline disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => handleDelete(r.id)}
                    className="text-clay hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
