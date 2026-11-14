import type { Metadata } from "next";
import { getCurrentWishlist } from "@/lib/wishlist/service";
import WishlistGrid from "@/components/wishlist/WishlistGrid";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = {
  title: `Wishlist — ${getBrandSettings().name}`,
  description: "Products you've saved for later.",
  robots: { index: false, follow: false },
};

/**
 * Works for both guests (cookie-backed) and logged-in users (DB-backed) —
 * getCurrentWishlist() already handles that dispatch, so this page doesn't
 * need to know or care which one it's rendering for.
 */
export default async function WishlistPage() {
  const items = await getCurrentWishlist();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-display text-2xl text-ink sm:text-3xl">Wishlist</h1>

      <WishlistGrid items={items} />
    </div>
  );
}
