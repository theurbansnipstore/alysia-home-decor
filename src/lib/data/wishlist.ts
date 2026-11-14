import "server-only";
import { prisma } from "@/lib/prisma";
import { toProductCardDTO } from "@/lib/data/products";
import type { ProductCardDTO } from "@/types";

export interface WishlistLineItemDTO {
  productId: string;
  product: ProductCardDTO;
}

/** Always scoped by userId — never accepts or trusts an id from the client. */
export async function getDbWishlist(userId: string): Promise<WishlistLineItemDTO[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });

  return items
    .filter((i) => i.product.status === "ACTIVE")
    .map((i) => ({ productId: i.productId, product: toProductCardDTO(i.product) }));
}

export async function getDbWishlistProductIds(userId: string): Promise<string[]> {
  const items = await prisma.wishlistItem.findMany({ where: { userId }, select: { productId: true } });
  return items.map((i) => i.productId);
}

/** Upsert on the existing @@unique([userId, productId]) — a duplicate add is a harmless no-op. */
export async function addToDbWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlistItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });
}

/** deleteMany is naturally idempotent — removing an item that isn't there is a no-op, not an error. */
export async function removeFromDbWishlist(userId: string, productId: string): Promise<void> {
  await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
}

export async function getDbWishlistCount(userId: string): Promise<number> {
  return prisma.wishlistItem.count({ where: { userId } });
}
