import { NextRequest } from "next/server";
import { getThemeBySlug } from "@/lib/data/themes";
import { getProductCatalog, parseCatalogSearchParams } from "@/lib/data/catalog";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const theme = await getThemeBySlug(params.slug);
    if (!theme) {
      return apiError("Theme not found", 404);
    }

    const { searchParams } = new URL(req.url);
    const plain: Record<string, string | string[] | undefined> = {};
    for (const key of searchParams.keys()) {
      const values = searchParams.getAll(key);
      plain[key] = values.length > 1 ? values : values[0];
    }
    const filters = parseCatalogSearchParams(plain);

    const { products, pagination } = await getProductCatalog({ ...filters, themeSlug: theme.slug });

    return apiSuccess({ theme, products, pagination });
  } catch (err) {
    console.error("[GET /api/themes/[slug]]", err);
    return apiError("Failed to load theme", 500);
  }
}
