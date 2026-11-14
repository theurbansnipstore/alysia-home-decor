import { FREE_SHIPPING_THRESHOLD, SHIPPING_CHARGE } from "@/lib/config/cart";
import { DELIVERY_SETTINGS_PLACEHOLDER } from "@/lib/config/cart";
import type { ShippingProvider, ShippingQuote, ShippingAddressInput } from "./types";

/** Today's only real implementation — flat rate with a free-shipping threshold, both from Module 8's cart config. */
export class FlatRateShippingProvider implements ShippingProvider {
  key = "flat_rate";

  async quote({ subtotal }: { subtotal: number; address: ShippingAddressInput }): Promise<ShippingQuote> {
    const charge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    return {
      charge,
      estimatedDaysMin: DELIVERY_SETTINGS_PLACEHOLDER.estimatedDaysMin,
      estimatedDaysMax: DELIVERY_SETTINGS_PLACEHOLDER.estimatedDaysMax,
    };
  }
}

export const flatRateShippingProvider: ShippingProvider = new FlatRateShippingProvider();
