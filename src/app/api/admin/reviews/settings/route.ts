import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { setReviewsEnabled } from "@/lib/settings/reviews";
import { reviewsSettingSchema } from "@/lib/validations/review";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest) {
  const auth = await requireApiRole(REVIEW_MODERATOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = reviewsSettingSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    await setReviewsEnabled(parsed.data.enabled);
    return apiSuccess({ enabled: parsed.data.enabled });
  } catch (err) {
    console.error("[PATCH /api/admin/reviews/settings]", err);
    return apiError("Failed to update setting", 500);
  }
}
