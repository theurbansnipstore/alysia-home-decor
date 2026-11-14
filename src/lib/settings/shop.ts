import "server-only";
import { cache } from "react";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_shop";

/**
 * Shop/listing presentation + product-card button visibility. Query
 * logic (getProductCatalog, filter/sort implementations) is untouched —
 * these flags only control which existing, already-built controls render.
 * Unlike product-page.ts's PDP settings, Add to Cart IS toggleable here:
 * hiding it from a card only removes a shortcut — the product detail
 * page's Add to Cart (never toggleable) remains the real purchase path,
 * so this doesn't risk breaking the ability to buy.
 */
export interface ShopSettings {
  showFilters: boolean;
  showCategoryFilter: boolean;
  showThemeFilter: boolean;
  showPriceFilter: boolean;
  showSort: boolean;
  productsPerPage: 12 | 24 | 48;
  gridColumns: 3 | 4;
  showWishlistOnCards: boolean;
  showAddToCartOnCards: boolean;
  /**
   * Off by default — a genuinely new visual feature (nothing to "match
   * today's rendering" against), and real review volume is very low
   * right now, so most cards would show a sparse "0 (0)" rating. Admin
   * can opt in once there's enough review coverage for it to read as
   * trustworthy rather than empty. Rendering itself never causes N+1 —
   * see getRatingSummariesForProducts() in src/lib/data/reviews.ts,
   * called once per listing page, not once per card.
   */
  showRatingOnCards: boolean;
}

export const DEFAULT_SHOP: ShopSettings = {
  showFilters: true,
  showCategoryFilter: true,
  showThemeFilter: true,
  showPriceFilter: true,
  showSort: true,
  // 12, matching DEFAULT_PAGE_SIZE in src/lib/config/catalog.ts exactly —
  // an unconfigured store must paginate identically to before.
  productsPerPage: 12,
  // 3, not 4: matches today's literal Shop grid class (md:grid-cols-3)
  // exactly — an unconfigured store must render identically to before.
  gridColumns: 3,
  showWishlistOnCards: true,
  showAddToCartOnCards: true,
  showRatingOnCards: false,
};

/**
 * cache() memoizes this per request — ProductCard (rendered dozens of
 * times per listing page) calls this itself, and without memoization
 * that would be one redundant identical Setting read per card.
 */
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  return getStoreSetting(KEY, DEFAULT_SHOP);
});

export async function setShopSettings(value: ShopSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
