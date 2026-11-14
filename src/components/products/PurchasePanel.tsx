"use client";

import { useState } from "react";
import QuantitySelector from "@/components/products/QuantitySelector";
import AddToCartButton from "@/components/products/AddToCartButton";
import BuyItNowButton from "@/components/products/BuyItNowButton";
import WishlistButton from "@/components/products/WishlistButton";

interface PurchasePanelProps {
  productId: string;
  maxQuantity: number;
  inStock: boolean;
  showBuyItNow: boolean;
  showWishlist: boolean;
}

/**
 * Below `sm`, the three actions used to sit in one `flex flex-wrap` row —
 * with Add to Cart/Buy It Now both `w-full`, each forced its own line,
 * pushing Wishlist onto an ugly third line. Fixed with an explicit
 * grid (`minmax(0,1fr)` so button text can't blow out the column) and
 * compact mobile padding on the two CTA buttons, so all visible actions
 * always sit on one intentional row. `sm:` reverts to the original flex
 * row. The grid template adapts to however many of Buy It Now/Wishlist
 * are enabled — Add to Cart itself is never optional.
 */
export default function PurchasePanel({ productId, maxQuantity, inStock, showBuyItNow, showWishlist }: PurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const compactButton = "px-4 py-3 text-sm sm:px-8 sm:py-4 sm:text-base";

  const gridCols =
    showBuyItNow && showWishlist
      ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      : showBuyItNow || showWishlist
      ? "grid-cols-[minmax(0,1fr)_auto]"
      : "grid-cols-1";

  return (
    <div className="space-y-4">
      {inStock && <QuantitySelector max={maxQuantity} onChange={setQuantity} />}
      <div className={`grid ${gridCols} items-stretch gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4`}>
        <AddToCartButton
          productId={productId}
          quantity={inStock ? quantity : 0}
          inStock={inStock}
          className={compactButton}
        />
        {showBuyItNow && (
          <BuyItNowButton
            productId={productId}
            quantity={inStock ? quantity : 0}
            inStock={inStock}
            className={compactButton}
          />
        )}
        {showWishlist && <WishlistButton productId={productId} />}
      </div>
    </div>
  );
}
