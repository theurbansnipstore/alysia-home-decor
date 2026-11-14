"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface BuyItNowButtonProps {
  productId: string;
  quantity: number;
  inStock: boolean;
  className?: string;
}

/**
 * Deliberately reuses the existing cart + checkout architecture rather than
 * a separate purchase path: adds the item to the current cart, then
 * redirects to /checkout, which already handles stock validation, pricing,
 * COD, and Razorpay unchanged. Tradeoff (disclosed, not hidden): if the
 * shopper already has other items in their cart, those come along to
 * checkout too — building a true cart-bypassing "buy just this one item"
 * flow would mean new temporary checkout state, which the approved
 * decision for this pass explicitly ruled out in favor of architectural
 * safety.
 */
export default function BuyItNowButton({ productId, quantity, inStock, className }: BuyItNowButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't start checkout. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
      router.push("/checkout");
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={handleClick}
        disabled={!inStock || isSubmitting}
        className={cn("w-full sm:w-auto", className)}
        data-product-id={productId}
        data-quantity={quantity}
      >
        <Zap size={16} />
        {inStock ? (isSubmitting ? "Preparing…" : "Buy It Now") : "Out of Stock"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
