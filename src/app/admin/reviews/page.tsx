import { requireRole } from "@/lib/session";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { getAdminReviewList } from "@/lib/data/reviews";
import { getReviewsEnabled } from "@/lib/settings/reviews";
import { getProductReviewsOverrides } from "@/lib/settings/product-reviews";
import ReviewFilters from "@/components/admin/reviews/ReviewFilters";
import ReviewTable from "@/components/admin/reviews/ReviewTable";
import ReviewsToggle from "@/components/admin/reviews/ReviewsToggle";
import Pagination from "@/components/products/Pagination";

interface Props {
  searchParams: Record<string, string | undefined>;
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  await requireRole(REVIEW_MODERATOR_ROLES);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const status = searchParams.status === "pending" || searchParams.status === "approved" ? searchParams.status : undefined;
  const rating = searchParams.rating ? parseInt(searchParams.rating, 10) : undefined;

  const [enabled, { reviews, pagination }, productOverrides] = await Promise.all([
    getReviewsEnabled(),
    getAdminReviewList({ status, rating, q: searchParams.q, page }),
    getProductReviewsOverrides(),
  ]);

  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    if (status) params.set("status", status);
    if (rating) params.set("rating", String(rating));
    params.set("page", String(p));
    return `/admin/reviews?${params.toString()}`;
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Reviews</h1>

      <ReviewsToggle enabled={enabled} />

      <ReviewFilters current={{ q: searchParams.q, status, rating: rating ? String(rating) : undefined }} />

      <p className="mb-3 text-xs text-ink-500">{pagination.total} review{pagination.total === 1 ? "" : "s"}</p>

      <ReviewTable reviews={reviews} disabledProductIds={productOverrides.disabledProductIds} />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} buildHref={buildHref} />
    </div>
  );
}
