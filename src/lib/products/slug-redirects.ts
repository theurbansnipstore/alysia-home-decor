import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * A slug is available for a product to take (on create, or as a new value
 * on update) only if no OTHER product currently lives at it, and no
 * redirect row for it belongs to a different product. `excludeProductId`
 * lets an update pass its own id so re-adopting one of its own past slugs
 * isn't treated as a collision — see recordSlugChange below, which cleans
 * that row up in the same transaction.
 */
export async function isSlugAvailable(newSlug: string, excludeProductId?: string): Promise<boolean> {
  const [liveConflict, redirectConflict] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: newSlug, ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
      select: { id: true },
    }),
    prisma.productSlugRedirect.findUnique({ where: { oldSlug: newSlug }, select: { productId: true } }),
  ]);
  if (liveConflict) return false;
  if (redirectConflict && redirectConflict.productId !== excludeProductId) return false;
  return true;
}

/**
 * Call inside the same transaction that writes the product's new slug.
 * Records the vacated slug so old links keep resolving to this product
 * (see getProductRedirectSlug in @/lib/data/products), and — if the new
 * slug happens to be one this same product used previously — removes that
 * stale forward-redirect row so a live slug is never also stored as its
 * own redirect target.
 */
export async function recordSlugChange(
  tx: Prisma.TransactionClient,
  productId: string,
  oldSlug: string,
  newSlug: string,
): Promise<void> {
  if (oldSlug === newSlug) return;

  await tx.productSlugRedirect.deleteMany({ where: { oldSlug: newSlug, productId } });
  await tx.productSlugRedirect.upsert({
    where: { oldSlug },
    create: { oldSlug, productId },
    update: { productId },
  });
}
