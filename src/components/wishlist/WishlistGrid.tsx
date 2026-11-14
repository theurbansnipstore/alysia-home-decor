import Link from "next/link";
import { Heart } from "lucide-react";
import ProductCard from "@/components/ui/ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import type { WishlistLineItemDTO } from "@/lib/data/wishlist";

/**
 * Shared between the dedicated /wishlist page and the Account → Wishlist
 * tab so the two entry points (storefront heart vs. account dashboard)
 * render identically without duplicating markup — both call the same
 * getCurrentWishlist() and just pass the result in here.
 */
export default function WishlistGrid({ items }: { items: WishlistLineItemDTO[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        description="Save products you love by tapping the heart icon — they'll show up here."
        action={
          <Link href="/shop" className="text-sm text-brass-600 hover:underline">
            Start browsing
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
      {items.map((item) => (
        <ProductCard key={item.productId} product={item.product} />
      ))}
    </div>
  );
}
