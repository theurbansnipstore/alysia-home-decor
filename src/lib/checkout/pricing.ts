import "server-only";
import { computeCartTotals, type CartTotals, type CartTotalsOptions } from "@/lib/cart/pricing";
import { COD_CHARGE, PACKING_CHARGE } from "@/lib/config/checkout";
import { TAX_CONFIG_PLACEHOLDER } from "@/lib/config/cart";
import { getShippingSettings } from "@/lib/settings/shipping";
import type { CartLineItemDTO } from "@/lib/data/cart";
import type { PaymentMethodKey } from "@/lib/config/checkout";

export interface OrderPricing extends CartTotals {
  packingCharge: number;
  codCharge: number;
  taxAmount: number;
  grandTotal: number;
}

/** Module 37: now async — reads the admin-configurable free-shipping threshold (src/lib/settings/shipping.ts) instead of a hardcoded constant. Every call site already runs inside an async server context. */
export async function computeOrderPricing(
  items: CartLineItemDTO[],
  options: CartTotalsOptions & { paymentMethod: PaymentMethodKey }
): Promise<OrderPricing> {
  const shippingSettings = await getShippingSettings();
  const cartTotals = computeCartTotals(items, {
    ...options,
    freeShippingEnabled: shippingSettings.freeShippingEnabled,
    freeShippingThreshold: shippingSettings.freeShippingThreshold,
  });

  const packingCharge = PACKING_CHARGE;
  const codCharge = options.paymentMethod === "COD" ? COD_CHARGE : 0;
  const taxAmount = TAX_CONFIG_PLACEHOLDER.enabled
    ? (cartTotals.subtotal * TAX_CONFIG_PLACEHOLDER.ratePercent) / 100
    : 0;

  const grandTotal = cartTotals.total + packingCharge + codCharge + taxAmount;

  return { ...cartTotals, packingCharge, codCharge, taxAmount, grandTotal };
}
