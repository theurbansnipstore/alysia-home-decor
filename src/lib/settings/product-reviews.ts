import "server-only";
import { cache } from "react";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "product_reviews_overrides";

export interface ProductReviewsOverrides {
  /** Product ids with reviews explicitly turned off, overriding the global toggle for that product only. Empty = every product follows the global setting. */
  disabledProductIds: string[];
}

export const DEFAULT_PRODUCT_REVIEWS_OVERRIDES: ProductReviewsOverrides = { disabledProductIds: [] };

/**
 * cache()'d — read once per request even though both the PDP and the
 * admin Reviews table check this on the same render pass.
 */
export const getProductReviewsOverrides = cache(async (): Promise<ProductReviewsOverrides> => {
  return getStoreSetting(KEY, DEFAULT_PRODUCT_REVIEWS_OVERRIDES);
});

export async function isProductReviewsEnabled(productId: string): Promise<boolean> {
  const { disabledProductIds } = await getProductReviewsOverrides();
  return !disabledProductIds.includes(productId);
}

export async function setProductReviewsEnabled(productId: string, enabled: boolean): Promise<void> {
  const current = await getStoreSetting(KEY, DEFAULT_PRODUCT_REVIEWS_OVERRIDES);
  const next = enabled
    ? current.disabledProductIds.filter((id) => id !== productId)
    : current.disabledProductIds.includes(productId)
    ? current.disabledProductIds
    : [...current.disabledProductIds, productId];
  await setStoreSetting(KEY, { disabledProductIds: next });
}
