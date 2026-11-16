// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { PRODUCT_AREA_ROLES } from "@/lib/admin/roles";
import { buildAdminProductWhere } from "@/lib/data/admin-products";
import { getProductsForExport, serializeProductRows } from "@/lib/admin/product-export";
import { MAX_BULK_SELECTION } from "@/lib/validations/bulk-product";
import { getProductIdsByStockStatus, type StockStatus } from "@/lib/inventory/stock-service";
import type { ProductStatus } from "@prisma/client";

const STOCK_STATUS_KEYS: StockStatus[] = ["out", "low", "in"];

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(PRODUCT_AREA_ROLES);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "filtered";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  let productIds: string[];

  if (scope === "selected") {
    productIds = (url.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (productIds.length === 0) return apiError("No products selected.", 400);
  } else if (scope === "all") {
    const rows = await prisma.product.findMany({ select: { id: true }, take: MAX_BULK_SELECTION });
    productIds = rows.map((r) => r.id);
  } else {
    const where = buildAdminProductWhere({
      q: url.searchParams.get("q") || undefined,
      status: (url.searchParams.get("status") as ProductStatus) || undefined,
      categoryId: url.searchParams.get("categoryId") || undefined,
      themeId: url.searchParams.get("themeId") || undefined,
      isFeatured: url.searchParams.get("isFeatured") === "true" ? true : undefined,
      isBestSeller: url.searchParams.get("isBestSeller") === "true" ? true : undefined,
      isTrending: url.searchParams.get("isTrending") === "true" ? true : undefined,
      isNewArrival: url.searchParams.get("isNewArrival") === "true" ? true : undefined,
    });
    const stockStatusParam = url.searchParams.get("stockStatus");
    if (STOCK_STATUS_KEYS.includes(stockStatusParam as StockStatus)) {
      where.id = { in: await getProductIdsByStockStatus(stockStatusParam as StockStatus) };
    }
    const rows = await prisma.product.findMany({ where, select: { id: true }, take: MAX_BULK_SELECTION });
    productIds = rows.map((r) => r.id);
  }

  if (productIds.length === 0) return apiError("No products match this export.", 400);

  const rows = await getProductsForExport(productIds);
  const buffer = await serializeProductRows(rows, format);
  const filename = `products-export-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
