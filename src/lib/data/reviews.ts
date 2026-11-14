import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getShopSettings } from "@/lib/settings/shop";
import type { ProductCardDTO } from "@/types";

const DEFAULT_PAGE_SIZE = 10;

export interface ReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date;
  isVerified: boolean;
  customerName: string;
}

export interface ReviewSummaryDTO {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface AccountReviewDTO extends ReviewDTO {
  productId: string;
  productName: string;
  productSlug: string;
  isApproved: boolean;
}

export interface AdminReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: Date;
  isApproved: boolean;
  isVerified: boolean;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName: string;
}

/** Average + count + 5/4/3/2/1 breakdown of *approved* reviews only — what the storefront shows. */
export async function getReviewSummary(productId: string): Promise<ReviewSummaryDTO> {
  const [result, grouped] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId, isApproved: true },
      _count: { rating: true },
    }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of grouped) {
    if (row.rating >= 1 && row.rating <= 5) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
    }
  }

  return {
    average: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
    count: result._count.rating,
    distribution,
  };
}

/**
 * One groupBy for every product's rating summary on a listing page —
 * deliberately NOT one query per ProductCard. Callers (Shop/Categories/
 * Themes pages) fetch this once for the whole product array and merge
 * the result into each ProductCardDTO before rendering.
 */
export async function getRatingSummariesForProducts(
  productIds: string[]
): Promise<Map<string, { average: number; count: number }>> {
  if (productIds.length === 0) return new Map();

  const grouped = await prisma.review.groupBy({
    by: ["productId", "rating"],
    where: { productId: { in: productIds }, isApproved: true },
    _count: { rating: true },
  });

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of grouped) {
    const entry = totals.get(row.productId) ?? { sum: 0, count: 0 };
    entry.sum += row.rating * row._count.rating;
    entry.count += row._count.rating;
    totals.set(row.productId, entry);
  }

  const result = new Map<string, { average: number; count: number }>();
  for (const [productId, { sum, count }] of totals) {
    result.set(productId, { average: count ? Math.round((sum / count) * 10) / 10 : 0, count });
  }
  return result;
}

/**
 * Convenience wrapper for listing pages (Shop/Categories/Themes): skips
 * the query entirely when store_shop.showRatingOnCards is off (the
 * default), so the feature costs nothing until an admin opts in. When on,
 * it's still exactly one query for the whole page, via
 * getRatingSummariesForProducts above — never one per card.
 */
export async function attachRatings(products: ProductCardDTO[]): Promise<ProductCardDTO[]> {
  const shopSettings = await getShopSettings();
  if (!shopSettings.showRatingOnCards || products.length === 0) return products;

  const ratings = await getRatingSummariesForProducts(products.map((p) => p.id));
  if (ratings.size === 0) return products;

  return products.map((p) => ({ ...p, rating: ratings.get(p.id) }));
}

export async function getApprovedReviews(
  productId: string,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE
): Promise<{ reviews: ReviewDTO[]; total: number; totalPages: number; page: number }> {
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true } } },
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      createdAt: r.createdAt,
      isVerified: r.isVerified,
      customerName: r.user.name,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    page,
  };
}

export async function getUserReviewForProduct(userId: string, productId: string) {
  return prisma.review.findFirst({ where: { userId, productId } });
}

export async function getAccountReviews(userId: string): Promise<AccountReviewDTO[]> {
  const rows = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } }, product: { select: { id: true, name: true, slug: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    createdAt: r.createdAt,
    isVerified: r.isVerified,
    isApproved: r.isApproved,
    customerName: r.user.name,
    productId: r.product.id,
    productName: r.product.name,
    productSlug: r.product.slug,
  }));
}

/**
 * A customer is a verified purchaser when they own a DELIVERED order
 * containing this product. Order.status is a single current-state field,
 * so "DELIVERED and not subsequently RETURNED/REFUNDED" collapses to just
 * checking the current status equals DELIVERED — a later return/refund
 * moves status away from DELIVERED, so this can never be stale-true.
 */
export async function computeIsVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: { userId, status: "DELIVERED", items: { some: { productId } } },
    select: { id: true },
  });
  return !!order;
}

export interface AdminReviewFilters {
  status?: "pending" | "approved";
  rating?: number;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function getAdminReviewList(filters: AdminReviewFilters = {}) {
  const { status, rating, q, page = 1, pageSize = 20 } = filters;

  const where: Prisma.ReviewWhereInput = {};
  if (status === "pending") where.isApproved = false;
  if (status === "approved") where.isApproved = true;
  if (rating) where.rating = rating;
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { product: { name: { contains: term } } },
      { user: { name: { contains: term } } },
      { comment: { contains: term } },
      { title: { contains: term } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true, email: true } }, product: { select: { id: true, name: true } } },
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews: rows.map(
      (r): AdminReviewDTO => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        createdAt: r.createdAt,
        isApproved: r.isApproved,
        isVerified: r.isVerified,
        customerName: r.user.name,
        customerEmail: r.user.email,
        productId: r.product.id,
        productName: r.product.name,
      })
    ),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
