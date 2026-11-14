import StarRating from "@/components/products/StarRating";

interface RatingDistributionProps {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Lives inside the #reviews section (not the compact near-title summary) so the top of the page stays uncluttered. */
export default function RatingDistribution({ average, count, distribution }: RatingDistributionProps) {
  if (count === 0) return null;

  return (
    <div className="mb-8 flex flex-col gap-6 border-b border-ink-100 pb-8 sm:flex-row sm:items-center">
      <div className="flex shrink-0 flex-col items-start gap-1">
        <span className="font-display text-3xl text-ink">{average.toFixed(1)}</span>
        <StarRating rating={average} size={16} />
        <span className="text-xs text-ink-500">
          {count} review{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="max-w-sm flex-1 space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const n = distribution[star] ?? 0;
          const pct = count > 0 ? Math.round((n / count) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-ink-500">
              <span className="w-10 shrink-0">{star} star</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bone-200">
                <div className="h-1.5 rounded-full bg-brass" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
