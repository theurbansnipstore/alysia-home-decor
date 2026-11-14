import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ProductCardDTO } from "@/types";
import { toProductCardDTO } from "@/lib/data/products";
import { getSearchProvider } from "@/lib/search/provider";
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, BADGE_FILTERS, PRICE_BUCKETS, type SortKey, type BadgeKey } from "@/lib/config/catalog";

export interface CatalogFilters {
  /** Locked to a single value on /categories/[slug]; a real filter choice on /shop. */
  categorySlug?: string;
  /** Locked to a single value on /themes/[slug]; a real filter choice on /shop. */
  themeSlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  /** OR'd together — a product matches if it has ANY selected badge. */
  badges?: BadgeKey[];
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface CatalogResult {
  products: ProductCardDTO[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  appliedFilters: CatalogFilters;
}

function resolveOrderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "best_selling":
      return { orderItems: { _count: "desc" } };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

/**
 * The single product-listing query for the whole catalog. /shop calls this
 * with whatever filters the user picked; /categories/[slug] and
 * /themes/[slug] call it with categorySlug/themeSlug pre-set (and hide
 * that filter section in the UI) — same engine, not a parallel
 * implementation. A future collection type (seasonal, manual, sale) is
 * meant to become another key on CatalogFilters, not a new function.
 */
/**
 * Parses the URL search params shared across all three catalog pages
 * (sort, page, badges, price bucket, availability, search) into
 * CatalogFilters. Deliberately excludes categorySlug/themeSlug — those are
 * page-specific (a real filter choice on /shop, a locked value on the
 * category/theme detail pages) and are set by the caller after this runs.
 */
export function parseCatalogSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): Omit<CatalogFilters, "categorySlug" | "themeSlug"> {
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : undefined;
  const sort: SortKey = (["newest", "price_asc", "price_desc", "best_selling"] as const).includes(
    sortParam as SortKey
  )
    ? (sortParam as SortKey)
    : DEFAULT_SORT;

  const page = Math.max(1, parseInt(typeof searchParams.page === "string" ? searchParams.page : "1", 10) || 1);

  const badgeParam = searchParams.badge;
  const badges = (Array.isArray(badgeParam) ? badgeParam : badgeParam ? [badgeParam] : []).filter(
    (b): b is BadgeKey => b in BADGE_FILTERS
  );

  const priceIndexRaw = typeof searchParams.price === "string" ? parseInt(searchParams.price, 10) : NaN;
  const bucket = Number.isInteger(priceIndexRaw) ? PRICE_BUCKETS[priceIndexRaw] : undefined;

  const inStockOnly = searchParams.inStock === "1";
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;

  return {
    sort,
    page,
    q,
    minPrice: bucket?.min,
    maxPrice: bucket?.max,
    inStockOnly,
    badges,
  };
}

export async function getProductCatalog(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const {
    categorySlug,
    themeSlug,
    q,
    minPrice,
    maxPrice,
    inStockOnly,
    badges,
    sort = DEFAULT_SORT,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filters;

  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (categorySlug) where.category = { slug: categorySlug };
  if (themeSlug) where.theme = { slug: themeSlug };

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { gte: minPrice } : {}),
      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
    };
  }

  if (inStockOnly) {
    where.stockAvailable = { gt: 0 };
  }

  if (badges && badges.length > 0) {
    where.OR = badges.map((key) => ({ [BADGE_FILTERS[key].field]: true }) as Prisma.ProductWhereInput);
  }

  if (q && q.trim()) {
    const matchedIds = await getSearchProvider().search(q.trim());
    where.id = { in: matchedIds };
  }

  const orderBy = resolveOrderBy(sort);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: items.map(toProductCardDTO),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    appliedFilters: filters,
  };
}
