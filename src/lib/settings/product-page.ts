import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_product_page";

/** Module 37 Part 4 — one row per accordion section (was a single showPolicyInfo-only toggle with hardcoded Delivery/Returns/Care text in src/lib/config/product-badges.ts). Reuses the exact PolicySectionSetting shape already established by shipping.ts/returns.ts. */
export interface ProductPolicySetting {
  id: string;
  heading: string;
  body: string;
  enabled: boolean;
  sortOrder: number;
}

/** Module 37 Part 5 — the three "Handcrafted / Artisan Made / Sustainably Sourced" icons above the product title, previously a hardcoded, non-toggleable array (src/lib/config/product-badges.ts). Icon stays code-controlled (fixed Hammer/Sparkles/Leaf mapping by id) — only content and visibility are admin-editable. */
export interface ProductBadgeSetting {
  id: "handcrafted" | "artisanMade" | "sustainablySourced";
  title: string;
  description: string;
  enabled: boolean;
}

/** Module 37 Part 6 — the "Materials & Craftsmanship" section shared by the product page and the About page. Only the product page reads this; About page keeps its own static defaults unchanged (it's a distinct page with its own established content, not in this module's stated scope). */
export interface CraftsmanshipSetting {
  enabled: boolean;
  image: string;
  title: string;
  body: string;
}

/**
 * Presentation toggles only. Add to Cart is deliberately NOT here — it's
 * the core purchase mechanism, not decor; disabling it would break the
 * store rather than remove a feature. Required product data (images,
 * title, price, stock) is likewise not toggleable.
 */
export interface ProductPageSettings {
  showRatingReviews: boolean;
  showBuyItNow: boolean;
  showWishlist: boolean;
  showSpecifications: boolean;
  showRelatedProducts: boolean;
  /** Master switch for the whole accordion — the per-policy `enabled` flags below only matter while this stays on. */
  showPolicyInfo: boolean;
  policies: ProductPolicySetting[];
  badges: ProductBadgeSetting[];
  craftsmanship: CraftsmanshipSetting;
}

/** Text/image defaults match the copy that was hardcoded in src/lib/config/product-badges.ts and CraftsmanshipSection.tsx exactly, so an unconfigured store renders identically to before. */
export const DEFAULT_PRODUCT_PAGE: ProductPageSettings = {
  showRatingReviews: true,
  showBuyItNow: true,
  showWishlist: true,
  showSpecifications: true,
  showRelatedProducts: true,
  showPolicyInfo: true,
  policies: [
    {
      id: "delivery",
      heading: "Delivery Information",
      body: "Dispatched within 2–4 business days. Complimentary shipping on orders over ₹2,999. Estimated delivery in 5–9 business days depending on location.",
      enabled: true,
      sortOrder: 0,
    },
    {
      id: "returns",
      heading: "Returns & Exchanges",
      body: "7-day easy returns on unused items in original packaging. Handcrafted pieces may show minor natural variation in grain, glaze, or weave — this is expected character, not a defect.",
      enabled: true,
      sortOrder: 1,
    },
    {
      id: "care",
      heading: "Care Instructions",
      body: "Dust gently with a soft, dry cloth. Keep away from direct sunlight and moisture where possible. Handcrafted materials age gracefully with light, regular care.",
      enabled: true,
      sortOrder: 2,
    },
  ],
  badges: [
    { id: "handcrafted", title: "Handcrafted", description: "Made by hand, with traditional techniques passed through generations.", enabled: true },
    { id: "artisanMade", title: "Artisan Made", description: "Produced in small batches by independent craftspeople, not mass-manufactured.", enabled: true },
    { id: "sustainablySourced", title: "Sustainably Sourced", description: "Natural, responsibly sourced materials wherever possible.", enabled: true },
  ],
  craftsmanship: {
    enabled: true,
    image: "https://images.pexels.com/photos/29998352/pexels-photo-29998352.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&dpr=1",
    title: "Made by hand, built to last",
    body: "Every piece in this collection is produced in small batches by independent artisans, using techniques passed through generations. Natural variation in grain, glaze, or weave is part of the character — not a flaw.",
  },
};

export async function getProductPageSettings(): Promise<ProductPageSettings> {
  return getStoreSetting(KEY, DEFAULT_PRODUCT_PAGE);
}

export async function setProductPageSettings(value: ProductPageSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
