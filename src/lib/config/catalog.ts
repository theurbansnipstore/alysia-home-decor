export type SortKey = "newest" | "price_asc" | "price_desc" | "best_selling";

export interface SortOption {
  value: SortKey;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
];

export const DEFAULT_SORT: SortKey = "newest";
export const DEFAULT_PAGE_SIZE = 12;

/** Grid is the only implemented layout today; kept as a named config value
 *  (not hardcoded in the PLP) so a future list-view toggle is a config +
 *  component addition, not a search-and-replace across pages. */
export const DEFAULT_PRODUCT_LAYOUT: "grid" | "list" = "grid";

/**
 * The four rule-based ("automatic") collections Product's boolean flags
 * already represent. `field` is the actual Prisma column; `filterLabel` is
 * shown in FilterSidebar; `ribbonLabel` is shown on ProductCard. Centralized
 * here so a badge's display text is defined once, not duplicated between
 * the filter UI and the product card ribbon.
 *
 * Future collection types (seasonal, manual, sale, custom) are a new
 * dimension alongside category/theme/badges on the same catalog engine
 * (src/lib/data/catalog.ts) — not a reason to redesign this file's shape,
 * just to extend it.
 */
export type BadgeKey = "featured" | "trending" | "bestSeller" | "newArrival";

export interface BadgeFilterDef {
  key: BadgeKey;
  field: "isFeatured" | "isTrending" | "isBestSeller" | "isNewArrival";
  filterLabel: string;
  ribbonLabel: string;
}

export const BADGE_FILTERS: Record<BadgeKey, BadgeFilterDef> = {
  featured: { key: "featured", field: "isFeatured", filterLabel: "Featured", ribbonLabel: "Featured" },
  trending: { key: "trending", field: "isTrending", filterLabel: "Trending", ribbonLabel: "Trending" },
  bestSeller: { key: "bestSeller", field: "isBestSeller", filterLabel: "Best Seller", ribbonLabel: "Bestseller" },
  newArrival: { key: "newArrival", field: "isNewArrival", filterLabel: "New Arrivals", ribbonLabel: "New" },
};

export const BADGE_ORDER: BadgeKey[] = ["newArrival", "bestSeller", "featured", "trending"];

export interface PriceBucket {
  label: string;
  min?: number;
  max?: number;
}

/** Static buckets for now — revisit once the catalog is large enough that
 *  fixed ranges stop making sense; not schema/DB-driven yet by design. */
export const PRICE_BUCKETS: PriceBucket[] = [
  { label: "Under ₹1,000", max: 999 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "₹2,500 – ₹5,000", min: 2500, max: 5000 },
  { label: "Above ₹5,000", min: 5000 },
];

export type FilterSectionKey = "category" | "theme" | "badges" | "price" | "availability";

/** Order FilterSidebar renders its sections in. Category/theme sections
 *  are hidden (not just reordered) on their own locked detail pages —
 *  see FilterSidebar's `hiddenSections` prop. */
export const FILTER_SECTION_ORDER: FilterSectionKey[] = ["category", "theme", "badges", "price", "availability"];
