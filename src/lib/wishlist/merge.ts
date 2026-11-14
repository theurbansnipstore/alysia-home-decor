import "server-only";
import { prisma } from "@/lib/prisma";
import { getGuestWishlist, clearGuestWishlist } from "@/lib/wishlist/guest-wishlist";
import { addToDbWishlist } from "@/lib/data/wishlist";

/**
 * Call this right after createSession() succeeds in the login route,
 * alongside the existing mergeGuestCartIntoUserCart() call — mirrors that
 * function's structure exactly. Transparent to the user — no UI feedback.
 * Duplicate products are harmless (addToDbWishlist upserts on the existing
 * @@unique([userId, productId])). Guest wishlist items referencing
 * since-removed/inactive products are silently skipped rather than failing
 * the whole merge. The user's existing wishlist rows are never modified or
 * deleted — only new rows are ever added.
 */
export async function mergeGuestWishlistIntoUserWishlist(userId: string): Promise<void> {
  const guestProductIds = await getGuestWishlist();
  if (guestProductIds.length === 0) return;

  const validProducts = await prisma.product.findMany({
    where: { id: { in: guestProductIds }, status: "ACTIVE" },
    select: { id: true },
  });
  const validIds = new Set(validProducts.map((p) => p.id));

  for (const productId of guestProductIds) {
    if (validIds.has(productId)) {
      await addToDbWishlist(userId, productId);
    }
  }

  await clearGuestWishlist();
}
