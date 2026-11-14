import { FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from "@/lib/config/cart";
import type { CartLineItemDTO } from "@/lib/data/cart";

export interface CartTotals {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  amountToFreeShipping: number;
  freeShippingUnlocked: boolean;
}

export interface CartTotalsOptions {
  discountAmount?: number;
  freeShipping?: boolean;
  /** Module 37 — admin-configurable (src/lib/settings/shipping.ts), defaults preserve pre-Module-37 behavior exactly when omitted. */
  freeShippingEnabled?: boolean;
  freeShippingThreshold?: number;
}

export function computeCartTotals(items: CartLineItemDTO[], options: CartTotalsOptions = {}): CartTotals {
  const {
    discountAmount = 0,
    freeShipping = false,
    freeShippingEnabled = true,
    freeShippingThreshold = FREE_SHIPPING_THRESHOLD,
  } = options;

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = parseFloat(item.product.discountPrice || item.product.price);
    return sum + unitPrice * item.quantity;
  }, 0);

  // A coupon's own freeShipping flag (a separate mechanism) still waives
  // shipping even when the admin has disabled the subtotal threshold.
  const freeShippingUnlocked = freeShipping || (freeShippingEnabled && subtotal >= freeShippingThreshold);
  const shipping = subtotal === 0 || freeShippingUnlocked ? 0 : SHIPPING_CHARGE;
  const total = Math.max(0, subtotal + shipping - discountAmount);
  const amountToFreeShipping = freeShippingEnabled ? Math.max(0, freeShippingThreshold - subtotal) : 0;

  return { subtotal, shipping, discount: discountAmount, total, amountToFreeShipping, freeShippingUnlocked };
}
