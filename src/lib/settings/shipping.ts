import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_shipping";

export interface PolicySectionSetting {
  id: string;
  heading: string;
  body: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ShippingSettings {
  title: string;
  sections: PolicySectionSetting[];
  /** Module 37 — when false, the cart/checkout never waive the flat shipping charge based on subtotal (a coupon's own freeShipping flag, if any, is unaffected — that's a separate mechanism). */
  freeShippingEnabled: boolean;
  /** Module 37 — the real business threshold, previously hardcoded as FREE_SHIPPING_THRESHOLD in src/lib/config/cart.ts. The flat charge below this amount (SHIPPING_CHARGE, ₹149) stays code-controlled — only the threshold itself becomes admin-editable, per this module's explicit scope. */
  freeShippingThreshold: number;
}

/** Seeded from the real, already-live "Delivery Information" copy in src/lib/config/product-badges.ts — not invented text. freeShippingThreshold matches the previous hardcoded FREE_SHIPPING_THRESHOLD (₹2,999) exactly, so an unconfigured store behaves identically. */
export const DEFAULT_SHIPPING: ShippingSettings = {
  title: "Shipping Information",
  sections: [
    {
      id: "delivery",
      heading: "Delivery Information",
      body: "Dispatched within 2–4 business days. Complimentary shipping on orders over ₹2,999. Estimated delivery in 5–9 business days depending on location.",
      enabled: true,
      sortOrder: 0,
    },
  ],
  freeShippingEnabled: true,
  freeShippingThreshold: 2999,
};

export async function getShippingSettings(): Promise<ShippingSettings> {
  return getStoreSetting(KEY, DEFAULT_SHIPPING);
}

export async function setShippingSettings(value: ShippingSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
