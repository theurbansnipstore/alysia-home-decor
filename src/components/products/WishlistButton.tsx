"use client";

import { Heart } from "lucide-react";
import { useTimedMessage } from "@/lib/hooks/useTimedMessage";
import { useIsWishlisted, addWishlistItem, removeWishlistItem } from "@/lib/hooks/useWishlist";
import { useState } from "react";

export default function WishlistButton({ productId }: { productId: string }) {
  const wishlisted = useIsWishlisted(productId);
  const [busy, setBusy] = useState(false);
  const [message, showMessage] = useTimedMessage();

  async function handleClick() {
    setBusy(true);
    const result = wishlisted ? await removeWishlistItem(productId) : await addWishlistItem(productId);
    setBusy(false);

    if (!result.success) {
      showMessage(result.error || "Something went wrong. Please try again.");
      return;
    }
    showMessage(wishlisted ? "Removed from wishlist." : "Added to wishlist.");
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wishlisted}
        data-product-id={productId}
        className={`flex h-11 w-11 items-center justify-center border transition-colors ${
          wishlisted ? "border-brass text-brass-600" : "border-ink-100 text-ink-700 hover:border-brass hover:text-brass-600"
        }`}
      >
        <Heart size={17} fill={wishlisted ? "currentColor" : "none"} />
      </button>
      {message && (
        <p role="status" className="mt-2 text-xs text-ink-500">
          {message}
        </p>
      )}
    </div>
  );
}
