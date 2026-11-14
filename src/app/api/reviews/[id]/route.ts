import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { deleteOwnReview } from "@/lib/reviews/service";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * PATCH (customer edit) deliberately removed — customer-facing review
 * editing is out of scope by design. Admin moderation still edits
 * isApproved via /api/admin/reviews/[id], a separate route.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session) return apiError("Authentication required.", 401);

    const result = await deleteOwnReview(session.id, params.id);
    if (!result.ok) return apiError(result.error, result.status);

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/reviews/[id]]", err);
    return apiError("Failed to delete review", 500);
  }
}
