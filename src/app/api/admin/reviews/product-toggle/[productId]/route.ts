import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { setProductReviewsEnabled } from "@/lib/settings/product-reviews";
import { productReviewsToggleSchema } from "@/lib/validations/review";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Per-product review override, kept in the Reviews admin domain (not
 * /api/admin/products/**, which stays untouched) — reuses the same
 * Setting-based mechanism as the global toggle, just a second key
 * holding a list of overridden product ids instead of a single boolean.
 */
export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  const auth = await requireApiRole(REVIEW_MODERATOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = productReviewsToggleSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    await setProductReviewsEnabled(params.productId, parsed.data.enabled);
    return apiSuccess({ productId: params.productId, enabled: parsed.data.enabled });
  } catch (err) {
    console.error("[PATCH /api/admin/reviews/product-toggle/[productId]]", err);
    return apiError("Failed to update product review setting", 500);
  }
}
