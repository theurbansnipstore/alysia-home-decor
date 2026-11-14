import { formatPrice } from "@/lib/utils";
import { cartContent } from "@/lib/content/cart";

interface ShippingProgressBarProps {
  subtotal: number;
  threshold: number;
  unlocked: boolean;
  /** Module 37 — admin can disable the threshold entirely (src/lib/settings/shipping.ts); the progress bar has nothing meaningful to show in that state. */
  enabled: boolean;
}

export default function ShippingProgressBar({ subtotal, threshold, unlocked, enabled }: ShippingProgressBarProps) {
  if (subtotal === 0 || !enabled || threshold <= 0) return null;

  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <div className="mb-4">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100" role="presentation">
        <div
          className="h-full rounded-full bg-sage-600 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-500" aria-live="polite">
        {unlocked ? cartContent.freeShippingUnlocked : cartContent.freeShippingProgress(formatPrice(remaining))}
      </p>
    </div>
  );
}
