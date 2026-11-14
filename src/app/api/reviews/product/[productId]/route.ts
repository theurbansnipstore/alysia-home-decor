import { NextRequest } from "next/server";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import { isProductReviewsEnabled } from "@/lib/settings/product-reviews";
import { getApprovedReviews, getReviewSummary } from "@/lib/data/reviews";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: { productId: string } }) {
  try {
    const [globalEnabled, productEnabled] = await Promise.all([
      getReviewsEnabled(),
      isProductReviewsEnabled(params.productId),
    ]);
    const enabled = globalEnabled && productEnabled;
    if (!enabled) {
      return apiSuccess({
        enabled: false,
        summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        reviews: [],
        total: 0,
        totalPages: 1,
        page: 1,
      });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const [summary, list] = await Promise.all([
      getReviewSummary(params.productId),
      getApprovedReviews(params.productId, page),
    ]);

    return apiSuccess({ enabled: true, summary, ...list });
  } catch (err) {
    console.error("[GET /api/reviews/product/[productId]]", err);
    return apiError("Failed to load reviews", 500);
  }
}
