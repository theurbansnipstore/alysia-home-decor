import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import { isProductReviewsEnabled } from "@/lib/settings/product-reviews";
import { createReview } from "@/lib/reviews/service";
import { createReviewSchema } from "@/lib/validations/review";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return apiError("Sign in to write a review.", 401);

    const enabled = await getReviewsEnabled();
    if (!enabled) return apiError("Reviews are currently disabled.", 403);

    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    if (!(await isProductReviewsEnabled(parsed.data.productId))) {
      return apiError("Reviews are currently disabled for this product.", 403);
    }

    const result = await createReview(session.id, parsed.data);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess(result.data, 201);
  } catch (err) {
    console.error("[POST /api/reviews]", err);
    return apiError("Failed to submit review", 500);
  }
}
