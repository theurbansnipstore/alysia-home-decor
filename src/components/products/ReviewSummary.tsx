import Link from "next/link";
import StarRating from "@/components/products/StarRating";

export default function ReviewSummary({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return (
      <Link href="#reviews" className="mt-2 block text-xs text-ink-500 hover:text-brass-600">
        No reviews yet — be the first to review this product.
      </Link>
    );
  }

  return (
    <Link href="#reviews" className="mt-2 flex items-center gap-2 text-sm hover:text-brass-600">
      <StarRating rating={average} />
      <span className="text-ink-700">{average.toFixed(1)}</span>
      <span className="text-ink-500">
        ({count} review{count === 1 ? "" : "s"})
      </span>
    </Link>
  );
}
