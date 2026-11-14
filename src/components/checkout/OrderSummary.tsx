import { formatPrice } from "@/lib/utils";
import { cartContent } from "@/lib/content/cart";
import type { OrderPricing } from "@/lib/checkout/pricing";

export default function OrderSummary({ pricing }: { pricing: OrderPricing }) {
  return (
    <div className="border border-ink-100 bg-bone-100 p-6">
      <h2 className="mb-5 font-display text-lg text-ink">{cartContent.summaryTitle}</h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-500">{cartContent.subtotalLabel}</dt>
          <dd className="text-charcoal">{formatPrice(pricing.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-500">{cartContent.shippingLabel}</dt>
          <dd className="text-charcoal">{pricing.shipping === 0 ? cartContent.freeLabel : formatPrice(pricing.shipping)}</dd>
        </div>
        {pricing.packingCharge > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-500">Packing</dt>
            <dd className="text-charcoal">{formatPrice(pricing.packingCharge)}</dd>
          </div>
        )}
        {pricing.codCharge > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-500">COD Fee</dt>
            <dd className="text-charcoal">{formatPrice(pricing.codCharge)}</dd>
          </div>
        )}
        {pricing.taxAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-500">Tax</dt>
            <dd className="text-charcoal">{formatPrice(pricing.taxAmount)}</dd>
          </div>
        )}
        {pricing.discount > 0 && (
          <div className="flex justify-between text-clay">
            <dt>{cartContent.discountLabel}</dt>
            <dd>−{formatPrice(pricing.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-ink-100 pt-3 font-mono text-base text-ink">
          <dt>{cartContent.totalLabel}</dt>
          <dd>{formatPrice(pricing.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
