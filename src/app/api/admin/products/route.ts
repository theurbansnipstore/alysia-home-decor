// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { PRODUCT_AREA_ROLES, FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getAdminProductList, type AdminSortKey } from "@/lib/data/admin-products";
import { productCreateSchema, productDetailAttributesSchema } from "@/lib/validations/product";
import { WELL_KNOWN_ATTRIBUTE_LABELS, upsertAttribute } from "@/lib/admin/product-attributes";
import { logActivity } from "@/lib/admin/activity-log";
import { isSlugAvailable } from "@/lib/products/slug-redirects";
import type { StockStatus } from "@/lib/inventory/stock-service";
import type { ProductStatus } from "@prisma/client";

const SORT_KEYS: AdminSortKey[] = [
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
  "price_asc",
  "price_desc",
  "stock_asc",
  "stock_desc",
];
const STATUS_KEYS: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];
const STOCK_STATUS_KEYS: StockStatus[] = ["out", "low", "in"];

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(PRODUCT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sortParam = searchParams.get("sort");
    const statusParam = searchParams.get("status");
    const stockStatusParam = searchParams.get("stockStatus");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const result = await getAdminProductList({
      q: searchParams.get("q") || undefined,
      status: STATUS_KEYS.includes(statusParam as ProductStatus) ? (statusParam as ProductStatus) : undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      themeId: searchParams.get("themeId") || undefined,
      stockStatus: STOCK_STATUS_KEYS.includes(stockStatusParam as StockStatus) ? (stockStatusParam as StockStatus) : undefined,
      isFeatured: searchParams.get("isFeatured") === "true" ? true : undefined,
      isBestSeller: searchParams.get("isBestSeller") === "true" ? true : undefined,
      isTrending: searchParams.get("isTrending") === "true" ? true : undefined,
      isNewArrival: searchParams.get("isNewArrival") === "true" ? true : undefined,
      sort: SORT_KEYS.includes(sortParam as AdminSortKey) ? (sortParam as AdminSortKey) : undefined,
      page,
    });

    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/admin/products]", err);
    return apiError("Failed to load products", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = productCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid product data", 400, parsed.error.flatten().fieldErrors);
    }
    const data = parsed.data;

    const [slugAvailable, skuTaken, category, theme] = await Promise.all([
      isSlugAvailable(data.slug),
      prisma.product.findUnique({ where: { sku: data.sku }, select: { id: true } }),
      prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }),
      data.themeId ? prisma.theme.findUnique({ where: { id: data.themeId }, select: { id: true } }) : Promise.resolve(null),
    ]);
    // Checks both live product slugs and historical redirect slugs (Module
    // 32) — a brand-new product can't be routed ambiguously with either.
    if (!slugAvailable) return apiError("A product with this slug already exists.", 409, { slug: ["Slug already in use."] });
    if (skuTaken) return apiError("A product with this SKU already exists.", 409, { sku: ["SKU already in use."] });
    // Module 34: proactive existence checks — without these, a nonexistent
    // categoryId/themeId only surfaces as a foreign-key violation caught by
    // the generic catch block below (a 500, not a clean 400), same gap
    // bulk-edit and bulk-import already guard against for this exact case.
    if (!category) return apiError("Selected category does not exist.", 400, { categoryId: ["Category not found."] });
    if (data.themeId && !theme) return apiError("Selected theme does not exist.", 400, { themeId: ["Theme not found."] });

    // Product creation and its audit entry succeed or fail together (Module
    // 23 Part 7) — a create that throws (e.g. a slug/SKU race lost to
    // another request between the pre-check above and this write) must
    // never leave behind an ActivityLog row claiming a product was created.
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          price: data.price,
          discountPrice: data.discountPrice ?? null,
          sku: data.sku,
          barcode: data.barcode ?? null,
          brand: data.brand ?? null,
          weightGrams: data.weightGrams ?? null,
          dimensions: data.dimensions ?? null,
          tags: data.tags ?? null,
          status: data.status ?? "DRAFT",
          categoryId: data.categoryId,
          themeId: data.themeId ?? null,
          stockAvailable: data.stockAvailable ?? 0,
          lowStockAt: data.lowStockAt ?? 5,
          returnPolicyOverride: data.returnPolicyOverride ?? null,
        },
      });

      await logActivity(tx, {
        userId: auth.session.id,
        action: "product.created",
        entity: "Product",
        entityId: created.id,
        metadata: {
          action: "CREATE",
          productName: created.name,
          sku: created.sku,
          categoryId: created.categoryId,
          price: created.price.toString(),
          status: created.status,
          stockAvailable: created.stockAvailable,
        },
      });

      return created;
    });

    const attrs = productDetailAttributesSchema.safeParse(body);
    if (attrs.success) {
      const d = attrs.data;
      await prisma.$transaction(async (tx) => {
        if (d.material !== undefined) await upsertAttribute(tx, product.id, WELL_KNOWN_ATTRIBUTE_LABELS[0], d.material);
        if (d.color !== undefined) await upsertAttribute(tx, product.id, WELL_KNOWN_ATTRIBUTE_LABELS[1], d.color);
        if (d.width !== undefined) await upsertAttribute(tx, product.id, WELL_KNOWN_ATTRIBUTE_LABELS[2], d.width);
        if (d.height !== undefined) await upsertAttribute(tx, product.id, WELL_KNOWN_ATTRIBUTE_LABELS[3], d.height);
        if (d.careInstructions !== undefined)
          await upsertAttribute(tx, product.id, WELL_KNOWN_ATTRIBUTE_LABELS[4], d.careInstructions);
      });
    }

    return apiSuccess({ id: product.id, slug: product.slug }, 201);
  } catch (err) {
    console.error("[POST /api/admin/products]", err);
    return apiError("Failed to create product", 500);
  }
}
