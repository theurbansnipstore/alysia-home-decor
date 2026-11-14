"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  productId: string;
  quantity: number;
  inStock: boolean;
  className?: string;
}

export default function AddToCartButton({ productId, quantity, inStock, className }: AddToCartButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
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
        setError(json.error || "Couldn't add this to your cart. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Module 9.5: navigate straight to the cart so it "immediately feels
      // useful" rather than leaving the shopper on the PDP with just a
      // toast — the cart the user just added to preserves everything.
      // router.push() alone does not guarantee the shared root layout
      // (where Header's cart badge lives) re-fetches its server data —
      // Next.js can reuse the cached layout render across navigations.
      // router.refresh() forces that re-fetch, so the badge updates
      // immediately rather than on some later, unrelated navigation.
      router.refresh();
      router.push("/cart?added=1");
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="primary"
        size="lg"
        onClick={handleClick}
        disabled={!inStock || isSubmitting}
        className={cn("w-full sm:w-auto", className)}
        data-product-id={productId}
        data-quantity={quantity}
      >
        <ShoppingBag size={17} />
        {inStock ? (isSubmitting ? "Adding…" : "Add to Cart") : "Out of Stock"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
