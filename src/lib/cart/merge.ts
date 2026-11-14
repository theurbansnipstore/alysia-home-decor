import "server-only";
import { prisma } from "@/lib/prisma";
import { getGuestCart, clearGuestCart } from "@/lib/cart/guest-cart";
import { addToDbCart } from "@/lib/data/cart";

/**
 * Call this right after createSession() succeeds in the login route.
 * Transparent to the user — no UI feedback, per the approved requirement.
 * Duplicate products increase quantity (via addToDbCart's increment).
 * Guest cart items referencing since-removed/inactive products are
 * silently skipped rather than failing the whole merge.
 */
export async function mergeGuestCartIntoUserCart(userId: string): Promise<void> {
  const guestItems = await getGuestCart();
  if (guestItems.length === 0) return;

  const productIds = guestItems.map((i) => i.productId);
  const validProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    select: { id: true },
  });
  const validIds = new Set(validProducts.map((p) => p.id));

  for (const item of guestItems) {
    if (validIds.has(item.productId)) {
      await addToDbCart(userId, item.productId, item.quantity);
    }
  }

  await clearGuestCart();
}
