import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { approveReview, hideReview, deleteReviewAsAdmin } from "@/lib/reviews/moderation";
import { adminReviewUpdateSchema } from "@/lib/validations/review";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(REVIEW_MODERATOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = adminReviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const count = parsed.data.isApproved ? await approveReview(params.id) : await hideReview(params.id);
    if (count === 0) return apiError("Review not found", 404);

    return apiSuccess({ id: params.id, isApproved: parsed.data.isApproved });
  } catch (err) {
    console.error("[PATCH /api/admin/reviews/[id]]", err);
    return apiError("Failed to update review", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(REVIEW_MODERATOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const count = await deleteReviewAsAdmin(params.id);
    if (count === 0) return apiError("Review not found", 404);

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/admin/reviews/[id]]", err);
    return apiError("Failed to delete review", 500);
  }
}
