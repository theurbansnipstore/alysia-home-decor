import { getSession } from "@/lib/session";
import { getAccountReviews } from "@/lib/data/reviews";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return apiError("Authentication required.", 401);

    const reviews = await getAccountReviews(session.id);
    return apiSuccess({ reviews });
  } catch (err) {
    console.error("[GET /api/account/reviews]", err);
    return apiError("Failed to load your reviews", 500);
  }
}
