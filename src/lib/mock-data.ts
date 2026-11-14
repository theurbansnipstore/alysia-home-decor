import { getImage } from "@/lib/images/registry";

// ---------- Story sections ----------
// Sourced from the centralized image registry (src/lib/images) rather than
// inline URLs — matches the "never scatter image URLs" architecture rule.
// Replacing either photo later is a one-line edit in registry.ts.

export const storyImages = {
  ourStory: getImage("storyOurCraft"),
  craftsmanship: getImage("storyCraftsmen"),
};

// NOTE (Module 37): every other export this file used to hold — heroSlides,
// mockCategories, mockThemes, trendingProducts/bestSellerProducts/
// newArrivalProducts, testimonials, instagramPosts, trustBadges — has been
// superseded by real, admin-editable sources and removed:
//   - mockCategories/mockThemes -> real Category/Theme rows via
//     src/lib/data/categories.ts / themes.ts (this was flagged as known
//     technical debt in an earlier module; Module 37 closed it)
//   - heroSlides/testimonials/instagramPosts/trustBadges -> Setting-backed
//     arrays in src/lib/settings/homepage.ts (Module 37 Part 8), editable
//     at /admin/content/homepage
//   - trendingProducts/bestSellerProducts/newArrivalProducts -> already
//     replaced by real getProductCatalog() queries in src/app/page.tsx
//     before this module
// Same precedent as shopMegaMenu below (superseded by
// src/lib/config/navigation.ts) — see PROJECT_DECISIONS.md, "Navigation
// Architecture".
