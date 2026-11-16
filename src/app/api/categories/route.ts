// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { getAllCategories } from "@/lib/data/categories";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return apiSuccess({ categories });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return apiError("Failed to load categories", 500);
  }
}
