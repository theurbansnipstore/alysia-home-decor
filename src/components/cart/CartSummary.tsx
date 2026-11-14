import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import CouponForm from "@/components/cart/CouponForm";
import ShippingProgressBar from "@/components/cart/ShippingProgressBar";
import { formatPrice } from "@/lib/utils";
import { cartContent } from "@/lib/content/cart";
import type { CartTotals } from "@/lib/cart/pricing";

interface CartSummaryProps {
  totals: CartTotals;
  appliedCoupon: string | null;
  showCoupon: boolean;
  /** Module 37 — the real, admin-configurable threshold (src/lib/settings/shipping.ts), passed down rather than imported as a static constant. */
  freeShippingThreshold: number;
  freeShippingEnabled: boolean;
}

const TRUST_BADGES = [
  { icon: Truck, label: "Fast, tracked delivery" },
  { icon: RotateCcw, label: "7-day easy returns" },
  { icon: ShieldCheck, label: "Secure checkout" },
];

export default function CartSummary({ totals, appliedCoupon, showCoupon, freeShippingThreshold, freeShippingEnabled }: CartSummaryProps) {
  return (
    <div className="border border-ink-100 bg-bone-100 p-6">
      <h2 className="mb-4 font-display text-lg text-ink">{cartContent.summaryTitle}</h2>

      <ShippingProgressBar
        subtotal={totals.subtotal}
        threshold={freeShippingThreshold}
        unlocked={totals.freeShippingUnlocked}
        enabled={freeShippingEnabled}
      />

      {showCoupon && <CouponForm appliedCoupon={appliedCoupon} />}

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">{cartContent.subtotalLabel}</dt>
          <dd className="text-charcoal">{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">{cartContent.shippingLabel}</dt>
          <dd className="text-charcoal">{totals.shipping === 0 ? cartContent.freeLabel : formatPrice(totals.shipping)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-clay">
            <dt>{cartContent.discountLabel}</dt>
            <dd>−{formatPrice(totals.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-ink-100 pt-3 font-mono text-base text-ink">
          <dt>{cartContent.totalLabel}</dt>
          <dd>{formatPrice(totals.total)}</dd>
        </div>
      </dl>

      <Link href="/checkout" className="mt-6 block">
        <Button type="button" variant="primary" size="lg" className="w-full" disabled={totals.subtotal === 0}>
          {cartContent.checkoutButton}
        </Button>
      </Link>

      <div className="mt-6 space-y-2 border-t border-ink-100 pt-4">
        {TRUST_BADGES.map((badge) => (
          <div key={badge.label} className="flex items-center gap-2 text-xs text-ink-500">
            <badge.icon size={14} className="text-sage-600" aria-hidden />
            {badge.label}
          </div>
        ))}
      </div>
    </div>
  );
}
