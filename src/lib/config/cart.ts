/**
 * Cart behavior configuration. Nothing customer-facing lives here — see
 * src/lib/content/cart.ts for copy. This split (config = behavior,
 * content = text) is a standing project rule from Module 8 onward.
 */

export const FREE_SHIPPING_THRESHOLD = 2999;
export const SHIPPING_CHARGE = 149;
export const MAX_QUANTITY_PER_ITEM = 10;
export const COUPON_CODE_MAX_LENGTH = 20;

/**
 * Placeholders for future modules. Not implemented yet — kept here now so
 * Module 9+ (Checkout/Tax) extends this file instead of introducing a
 * second, competing config source.
 */
export const TAX_CONFIG_PLACEHOLDER = {
  enabled: false,
  ratePercent: 0,
};

export const DELIVERY_SETTINGS_PLACEHOLDER = {
  estimatedDaysMin: 5,
  estimatedDaysMax: 9,
};
