import { Star } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getAccountReviews } from "@/lib/data/reviews";
import EmptyState from "@/components/ui/EmptyState";
import AccountReviewCard from "@/components/account/AccountReviewCard";

export default async function AccountReviewsPage() {
  const session = await requireSession();
  const reviews = await getAccountReviews(session.id);

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No reviews yet"
        description="Reviews you write for products will show up here."
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">My Reviews</h1>
      <div className="space-y-4">
        {reviews.map((r) => (
          <AccountReviewCard key={r.id} review={r} />
        ))}
      </div>
    </div>
  );
}
