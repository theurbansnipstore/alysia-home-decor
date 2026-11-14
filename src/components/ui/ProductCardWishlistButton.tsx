"use client";

import type { MouseEvent } from "react";
import { Heart } from "lucide-react";
import { useIsWishlisted, addWishlistItem, removeWishlistItem } from "@/lib/hooks/useWishlist";

/**
 * The small circular heart toggle used on ProductCard specifically — kept
 * as its own Client Component so ProductCard itself (used across the whole
 * site) can stay a plain server-renderable component; only this button's
 * own render/interactivity ships to the client. Uses the same shared
 * useWishlist hook/actions as the product-detail-page WishlistButton, so
 * add/remove logic isn't duplicated between the two.
 */
export default function ProductCardWishlistButton({ productId }: { productId: string }) {
  const wishlisted = useIsWishlisted(productId);

  async function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // ProductCard's heart sits inside the card's own <Link> — without
    // these, clicking it would also navigate to the product page.
    e.preventDefault();
    e.stopPropagation();
    if (wishlisted) await removeWishlistItem(productId);
    else await addWishlistItem(productId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-bone-100 text-ink shadow-sm opacity-100 transition-opacity ${
        wishlisted ? "" : "md:opacity-0 md:group-hover:opacity-100"
      }`}
    >
      <Heart size={16} fill={wishlisted ? "currentColor" : "none"} className={wishlisted ? "text-brass-600" : undefined} />
    </button>
  );
}
