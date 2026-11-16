// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getProductCatalog, parseCatalogSearchParams } from "@/lib/data/catalog";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plain: Record<string, string | string[] | undefined> = {};
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      plain[key] = values.length > 1 ? values : values[0];
    }

    const filters = parseCatalogSearchParams(plain);
    const categorySlug = searchParams.get("category") ?? undefined;
    const themeSlug = searchParams.get("theme") ?? undefined;

    const result = await getProductCatalog({ ...filters, categorySlug, themeSlug });
    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return apiError("Failed to load products", 500);
  }
}
