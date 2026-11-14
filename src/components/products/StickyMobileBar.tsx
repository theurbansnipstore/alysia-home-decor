"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

interface StickyMobileBarProps {
  productId: string;
  name: string;
  price: string;
  discountPrice?: string | null;
  inStock: boolean;
}

export default function StickyMobileBar({ productId, name, price, discountPrice, inStock }: StickyMobileBarProps) {
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
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't add this to your cart.");
        setIsSubmitting(false);
        return;
      }

      router.refresh();
      router.push("/cart?added=1");
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-bone-100/95 backdrop-blur lg:hidden">
      {error && (
        <p role="alert" className="border-b border-ink-100 bg-clay/5 px-4 py-1.5 text-center text-xs text-clay">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-700">{name}</p>
          <p className="font-mono text-sm text-ink">{formatPrice(discountPrice || price)}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleClick}
          disabled={!inStock || isSubmitting}
          data-product-id={productId}
        >
          <ShoppingBag size={16} />
          {inStock ? (isSubmitting ? "Adding…" : "Add to Cart") : "Sold Out"}
        </Button>
      </div>
    </div>
  );
}
