"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cartContent } from "@/lib/content/cart";

export default function CouponForm({ appliedCoupon }: { appliedCoupon: string | null }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't apply that coupon.");
        return;
      }
      setCode("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove() {
    setIsSubmitting(true);
    try {
      await fetch("/api/cart/coupon", { method: "DELETE" });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between border border-sage-600/40 bg-sage-100 px-3 py-2 text-sm">
        <span className="text-sage-600">{cartContent.couponAppliedMessage(appliedCoupon)}</span>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isSubmitting}
          aria-label={cartContent.couponRemoveLabel}
          className="text-sage-600 hover:text-clay"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="space-y-2">
      <div className="flex gap-2">
        <label htmlFor="coupon-code" className="sr-only">
          {cartContent.couponPlaceholder}
        </label>
        <input
          id="coupon-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={cartContent.couponPlaceholder}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={isSubmitting || !code.trim()}>
          {cartContent.couponApplyButton}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-clay">
          {error}
        </p>
      )}
    </form>
  );
}
