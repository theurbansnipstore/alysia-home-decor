import { NextRequest } from "next/server";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getProductCatalog, parseCatalogSearchParams } from "@/lib/data/catalog";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const category = await getCategoryBySlug(params.slug);
    if (!category) {
      return apiError("Category not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const plain: Record<string, string | string[] | undefined> = {};
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      plain[key] = values.length > 1 ? values : values[0];
    }
    const filters = parseCatalogSearchParams(plain);

    const { products, pagination } = await getProductCatalog({ ...filters, categorySlug: category.slug });

    return apiSuccess({ category, products, pagination });
  } catch (err) {
    console.error("[GET /api/categories/[slug]]", err);
    return apiError("Failed to load category", 500);
  }
}
