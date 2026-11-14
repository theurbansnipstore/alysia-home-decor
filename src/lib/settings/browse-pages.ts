import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_browse_pages";

/**
 * Module 37 Parts 9 & 12 — /categories, /themes, and /collections are all
 * the same shape of page: a real-data grid (Category/Theme rows, always
 * commerce-authoritative and unchanged here) with editorial chrome around
 * it (eyebrow, heading, description, optional hero image, SEO overrides)
 * that was previously hardcoded per page. One Setting row for all three —
 * they're small, related, and editing them together avoids three more
 * single-purpose admin pages for what's really one kind of content.
 * Collections has no dedicated Prisma model (confirmed: no Collection
 * table exists) — it's an aggregation of real Category + Theme data, so
 * this settings-only approach is the smallest correct architecture per
 * Module 37 Part 9's explicit instruction, not the generic Page model.
 */
export interface BrowsePageContent {
  eyebrow: string;
  title: string;
  description: string;
  heroImage: string;
  seoTitle: string;
  seoDesc: string;
}

export interface BrowsePagesSettings {
  shop: BrowsePageContent;
  categories: BrowsePageContent;
  themes: BrowsePageContent;
  collections: BrowsePageContent;
  /** Collections page only — the two section headings above the Category grid and the Theme grid. */
  collectionsRoomHeading: string;
  collectionsStyleHeading: string;
}

/** Matches each page's current hardcoded copy exactly, so an unconfigured store renders identically to before. */
export const DEFAULT_BROWSE_PAGES: BrowsePagesSettings = {
  // Module 38 Part 7 — /shop had no CMS control at all (title/eyebrow were
  // plain hardcoded JSX, description only existed inside generateMetadata's
  // brand-templated string). Defaults match that exact prior copy.
  shop: {
    eyebrow: "Shop All",
    title: "Every Piece, One Place",
    description: "",
    heroImage: "",
    seoTitle: "",
    seoDesc: "",
  },
  categories: {
    eyebrow: "Browse",
    title: "All Categories",
    description: "",
    heroImage: "",
    seoTitle: "",
    seoDesc: "Browse handcrafted home decor by category — living room, bedroom, dining, lighting, and more.",
  },
  themes: {
    eyebrow: "Regional Collections",
    title: "All Themes",
    description: "",
    heroImage: "",
    seoTitle: "",
    seoDesc: "",
  },
  collections: {
    eyebrow: "Discover",
    title: "Collections & Inspiration",
    description: "Find your starting point — shop by room, or explore collections inspired by India's regional craft traditions.",
    heroImage: "",
    seoTitle: "",
    seoDesc: "Shop by room, or explore collections inspired by India's regional craft traditions.",
  },
  collectionsRoomHeading: "Shop by Room",
  collectionsStyleHeading: "Shop by Style",
};

export async function getBrowsePagesSettings(): Promise<BrowsePagesSettings> {
  return getStoreSetting(KEY, DEFAULT_BROWSE_PAGES);
}

export async function setBrowsePagesSettings(value: BrowsePagesSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
