import "server-only";
import { prisma } from "@/lib/prisma";
import { computeIsVerifiedPurchase, getUserReviewForProduct } from "@/lib/data/reviews";
import type { CreateReviewInput } from "@/lib/validations/review";

export type ReviewActionResult<T = undefined> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** One review per user/product, enforced here (no DB unique constraint — see impact analysis). */
export async function createReview(
  userId: string,
  input: CreateReviewInput
): Promise<ReviewActionResult<{ id: string }>> {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== "ACTIVE") {
    return { ok: false, status: 404, error: "Product not found" };
  }

  const existing = await getUserReviewForProduct(userId, input.productId);
  if (existing) {
    return { ok: false, status: 409, error: "You've already reviewed this product." };
  }

  const isVerified = await computeIsVerifiedPurchase(userId, input.productId);

  const review = await prisma.review.create({
    data: {
      userId,
      productId: input.productId,
      rating: input.rating,
      title: input.title || null,
      comment: input.comment || null,
      isVerified,
      isApproved: false,
    },
    select: { id: true },
  });

  return { ok: true, data: { id: review.id } };
}

export async function deleteOwnReview(userId: string, reviewId: string): Promise<ReviewActionResult> {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, userId: true } });
  if (!review) return { ok: false, status: 404, error: "Review not found" };
  if (review.userId !== userId) return { ok: false, status: 403, error: "You can only delete your own review." };

  await prisma.review.delete({ where: { id: reviewId } });
  return { ok: true, data: undefined };
}
