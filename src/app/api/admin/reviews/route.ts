import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { getAdminReviewList } from "@/lib/data/reviews";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(REVIEW_MODERATOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const ratingParam = searchParams.get("rating");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const parsedRating = ratingParam ? parseInt(ratingParam, 10) : NaN;

    const result = await getAdminReviewList({
      status: statusParam === "pending" || statusParam === "approved" ? statusParam : undefined,
      rating: parsedRating >= 1 && parsedRating <= 5 ? parsedRating : undefined,
      q: searchParams.get("q") || undefined,
      page,
    });

    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/admin/reviews]", err);
    return apiError("Failed to load reviews", 500);
  }
}
