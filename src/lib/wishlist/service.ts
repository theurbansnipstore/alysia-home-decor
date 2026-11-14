import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toProductCardDTO } from "@/lib/data/products";
import {
  getDbWishlist,
  addToDbWishlist,
  removeFromDbWishlist,
  getDbWishlistProductIds,
  getDbWishlistCount,
  type WishlistLineItemDTO,
} from "@/lib/data/wishlist";
import { getGuestWishlist, addToGuestWishlist, removeFromGuestWishlist } from "@/lib/wishlist/guest-wishlist";

async function hydrateGuestWishlist(productIds: string[]): Promise<WishlistLineItemDTO[]> {
  if (productIds.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: "ACTIVE" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return productIds
    .filter((id) => byId.has(id))
    .map((id) => ({ productId: id, product: toProductCardDTO(byId.get(id)!) }));
}

/** The current wishlist, guest or logged-in — mirrors cart/service.ts's getCurrentCart() dispatch pattern. */
export async function getCurrentWishlist(): Promise<WishlistLineItemDTO[]> {
  const session = await getSession();
  if (session) return getDbWishlist(session.id);
  return hydrateGuestWishlist(await getGuestWishlist());
}

export async function getCurrentWishlistProductIds(): Promise<string[]> {
  const session = await getSession();
  if (session) return getDbWishlistProductIds(session.id);
  return getGuestWishlist();
}

export async function addToWishlist(productId: string): Promise<void> {
  const session = await getSession();
  if (session) await addToDbWishlist(session.id, productId);
  else await addToGuestWishlist(productId);
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const session = await getSession();
  if (session) await removeFromDbWishlist(session.id, productId);
  else await removeFromGuestWishlist(productId);
}

export async function getWishlistCount(): Promise<number> {
  const session = await getSession();
  if (session) return getDbWishlistCount(session.id);
  return (await getGuestWishlist()).length;
}
