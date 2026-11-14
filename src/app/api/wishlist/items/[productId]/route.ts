import { NextRequest } from "next/server";
import { getCurrentWishlist, removeFromWishlist } from "@/lib/wishlist/service";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function DELETE(_req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    // removeFromWishlist() is a no-op if the item isn't there — harmless/idempotent,
    // same convention as DELETE /api/cart/items/[productId].
    await removeFromWishlist(params.productId);
    const items = await getCurrentWishlist();
    return apiSuccess({ items });
  } catch (err) {
    console.error("[DELETE /api/wishlist/items/[productId]]", err);
    return apiError("Failed to remove from wishlist", 500);
  }
}
