import { NextRequest } from "next/server";
import { getProductBySlug } from "@/lib/data/products";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const result = await getProductBySlug(params.slug);
    if (!result) {
      return apiError("Product not found", 404);
    }
    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/products/[slug]]", err);
    return apiError("Failed to load product", 500);
  }
}
