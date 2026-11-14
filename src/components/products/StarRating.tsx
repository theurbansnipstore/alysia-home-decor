import { Star } from "lucide-react";

/** Read-only star display — server-renderable, no client JS. */
export default function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex gap-0.5 text-brass" aria-hidden>
      {stars.map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(rating) ? "currentColor" : "none"}
          strokeWidth={s <= Math.round(rating) ? 0 : 1.5}
        />
      ))}
    </div>
  );
}
