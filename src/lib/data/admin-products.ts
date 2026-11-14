import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProductStatus } from "@prisma/client";
import { getProductIdsByStockStatus, type StockStatus } from "@/lib/inventory/stock-service";

export type AdminSortKey = "newest" | "oldest" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc";

export interface AdminProductListFilters {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  themeId?: string;
  stockStatus?: StockStatus;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  sort?: AdminSortKey;
  page?: number;
  pageSize?: number;
}

const DEFAULT_ADMIN_PAGE_SIZE = 20;

function resolveAdminOrderBy(sort: AdminSortKey): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name_asc":
      return { name: "asc" };
    case "name_desc":
      return { name: "desc" };
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "stock_asc":
      return { stockAvailable: "asc" };
    case "stock_desc":
      return { stockAvailable: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export interface AdminProductWhereFilters {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  themeId?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
}

/** Shared by the admin list page and the bulk-edit/export "all matching
 *  filters" selection mode, so both resolve to the exact same set of
 *  products for identical filter input — one filter engine, not two.
 *  Stock status is deliberately NOT here — it's a per-row comparison
 *  between two columns (stockAvailable vs. lowStockAt) that a plain Prisma
 *  where can't express, so it's resolved separately in getAdminProductList
 *  via getProductIdsByStockStatus() and merged in as an `id: {in}` filter. */
export function buildAdminProductWhere(filters: AdminProductWhereFilters): Prisma.ProductWhereInput {
  const { q, status, categoryId, themeId, isFeatured, isBestSeller, isTrending, isNewArrival } = filters;
  const where: Prisma.ProductWhereInput = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (themeId) where.themeId = themeId;
  if (isFeatured !== undefined) where.isFeatured = isFeatured;
  if (isBestSeller !== undefined) where.isBestSeller = isBestSeller;
  if (isTrending !== undefined) where.isTrending = isTrending;
  if (isNewArrival !== undefined) where.isNewArrival = isNewArrival;
  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term } },
      { sku: { contains: term } },
      { barcode: { contains: term } },
    ];
  }
  return where;
}

export async function getAdminProductList(filters: AdminProductListFilters = {}) {
  const { sort = "newest", page = 1, pageSize = DEFAULT_ADMIN_PAGE_SIZE, stockStatus } = filters;

  const where = buildAdminProductWhere(filters);
  if (stockStatus) {
    const ids = await getProductIdsByStockStatus(stockStatus);
    where.id = { in: ids };
  }
  const orderBy = resolveAdminOrderBy(sort);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { id: true, name: true } },
        theme: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      price: p.price.toString(),
      discountPrice: p.discountPrice ? p.discountPrice.toString() : null,
      stockAvailable: p.stockAvailable,
      lowStockAt: p.lowStockAt,
      thumbnail: p.images[0]?.url ?? null,
      category: p.category,
      theme: p.theme,
      isFeatured: p.isFeatured,
      isBestSeller: p.isBestSeller,
      isTrending: p.isTrending,
      isNewArrival: p.isNewArrival,
      updatedAt: p.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getAdminProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      attributes: { orderBy: { sortOrder: "asc" } },
      category: { select: { id: true, name: true } },
      theme: { select: { id: true, name: true } },
      slugRedirects: { orderBy: { createdAt: "desc" }, select: { id: true, oldSlug: true, createdAt: true } },
    },
  });
  if (!product) return null;

  return {
    ...product,
    price: product.price.toString(),
    discountPrice: product.discountPrice ? product.discountPrice.toString() : null,
    variants: product.variants.map((v) => ({ ...v, price: v.price.toString() })),
  };
}

export type AdminProductDetail = NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>;
export type AdminProductListItem = Awaited<ReturnType<typeof getAdminProductList>>["products"][number];
