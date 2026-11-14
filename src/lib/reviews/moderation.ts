import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * deleteMany/updateMany-by-id (not update/delete) so a missing id returns a
 * 0 count instead of throwing — same idempotent-lookup pattern already used
 * by removeFromDbWishlist. Callers 404 on count === 0.
 */
export async function approveReview(id: string): Promise<number> {
  const result = await prisma.review.updateMany({ where: { id }, data: { isApproved: true } });
  return result.count;
}

/** "Hide" has no separate schema state from "pending" — both are isApproved: false. */
export async function hideReview(id: string): Promise<number> {
  const result = await prisma.review.updateMany({ where: { id }, data: { isApproved: false } });
  return result.count;
}

export async function deleteReviewAsAdmin(id: string): Promise<number> {
  const result = await prisma.review.deleteMany({ where: { id } });
  return result.count;
}
