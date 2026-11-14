import { z } from "zod";

// Not .optional() — client forms always submit a string key (possibly
// empty); an empty string already means "not set" for these fields, and
// keeping the inferred type as plain `string` (not `string | undefined`)
// matches every settings interface's required-string fields exactly.
const optionalUrlOrPath = z.string().trim().max(500);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);

export const brandingSettingsSchema = z.object({
  name: requiredText(100),
  tagline: optionalText(150),
  logoUrl: optionalUrlOrPath,
  faviconUrl: optionalUrlOrPath,
  seoDefaultTitle: optionalText(150),
  seoDefaultDescription: optionalText(300),
  ogImageUrl: optionalUrlOrPath,
});

const navItemSchema = z.object({
  id: z.string().min(1),
  label: requiredText(50),
  href: requiredText(200),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
  children: z
    .array(z.object({ id: z.string().min(1), label: requiredText(50), href: requiredText(200), enabled: z.boolean(), sortOrder: z.number().int() }))
    .optional(),
});
const shopByRoomLinkSchema = z.object({
  id: z.string().min(1),
  label: requiredText(50),
  href: requiredText(200),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});
const shopByRoomSchema = z.object({
  heading: requiredText(50),
  enabled: z.boolean(),
  links: z.array(shopByRoomLinkSchema).max(12),
});
const megaMenuRefSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int(),
});
const megaMenuColumnSchema = z.object({
  heading: requiredText(50),
  mode: z.enum(["auto", "custom"]),
  limit: z.number().int().min(1).max(20),
  refs: z.array(megaMenuRefSchema).max(20),
});
export const navigationSettingsSchema = z.object({
  items: z.array(navItemSchema).max(30),
  shopByRoom: shopByRoomSchema,
  megaMenuCategories: megaMenuColumnSchema,
  megaMenuThemes: megaMenuColumnSchema,
});

const footerLinkSchema = z.object({
  id: z.string().min(1),
  label: requiredText(50),
  href: requiredText(200),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});
const footerColumnSchema = z.object({
  id: z.string().min(1),
  heading: requiredText(50),
  sortOrder: z.number().int(),
  links: z.array(footerLinkSchema).max(15),
});
export const footerSettingsSchema = z.object({
  description: optionalText(300),
  copyrightText: optionalText(150),
  columns: z.array(footerColumnSchema).max(10),
});

const socialLinkSchema = z.object({
  id: z.string().min(1),
  platform: z.enum(["instagram", "facebook", "youtube", "pinterest", "twitter", "other"]),
  label: requiredText(50),
  url: z.string().trim().max(500).refine((v) => v === "" || z.string().url().safeParse(v).success, "Enter a valid URL"),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});
export const socialSettingsSchema = z.object({ links: z.array(socialLinkSchema).max(15) });

const homepageSectionSchema = z.object({
  id: z.enum([
    "hero",
    "featuredCategoriesRoom",
    "themeShowcase",
    "productRailTrending",
    "storyOurStory",
    "productRailBestSellers",
    "storyCraftsmanship",
    "productRailNewArrivals",
    "featuredCategoriesAll",
    "trustBadges",
    "testimonials",
    "instagram",
    "newsletter",
  ]),
  enabled: z.boolean(),
  order: z.number().int(),
  // .optional() here (unlike every other schema in this file) because
  // HomepageSectionSetting genuinely declares these as optional (`title?:
  // string`, not `title: string`) — different sections use different
  // subsets of fields, and a section that doesn't use a field shouldn't
  // need to send it as an empty string just to pass validation.
  title: optionalText(150).optional(),
  subtitle: optionalText(150).optional(),
  eyebrow: optionalText(80).optional(),
  body: optionalText(600).optional(),
  image: optionalUrlOrPath.optional(),
  ctaText: optionalText(50).optional(),
  ctaLink: optionalText(200).optional(),
  handle: optionalText(50).optional(),
  description: optionalText(300).optional(),
});
const heroSlideSchema = z.object({
  id: z.string().min(1),
  subtitle: optionalText(100),
  title: requiredText(200),
  image: optionalUrlOrPath,
  imageAlt: optionalText(200),
  ctaText: requiredText(60),
  ctaLink: requiredText(200),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

const trustBadgeItemSchema = z.object({
  id: z.string().min(1),
  icon: z.enum(["Truck", "ShieldCheck", "RotateCcw", "Sparkles"]),
  label: requiredText(100),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

const testimonialItemSchema = z.object({
  id: z.string().min(1),
  name: requiredText(100),
  location: optionalText(100),
  quote: requiredText(500),
  rating: z.number().int().min(1).max(5),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

const instagramItemSchema = z.object({
  id: z.string().min(1),
  image: optionalUrlOrPath,
  alt: optionalText(200),
  link: requiredText(500),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

export const homepageSettingsSchema = z.object({
  sections: z.array(homepageSectionSchema).max(20),
  heroSlides: z.array(heroSlideSchema).max(10),
  trustBadgeItems: z.array(trustBadgeItemSchema).max(10),
  testimonialItems: z.array(testimonialItemSchema).max(20),
  instagramItems: z.array(instagramItemSchema).max(12),
});

export const aboutSettingsSchema = z.object({
  introEyebrow: optionalText(80),
  introHeading: requiredText(150),
  introBody: optionalText(800),
  approachBody: optionalText(800),
  collectionsHeading: optionalText(150),
  collectionsBody: optionalText(800),
  qualityHeading: optionalText(150),
  qualityBody: optionalText(800),
});

export const announcementSettingsSchema = z.object({
  enabled: z.boolean(),
  text: requiredText(150),
  link: optionalUrlOrPath,
});

const browsePageContentSchema = z.object({
  eyebrow: optionalText(80),
  title: requiredText(150),
  description: optionalText(500),
  heroImage: optionalUrlOrPath,
  seoTitle: optionalText(150),
  seoDesc: optionalText(300),
});
export const browsePagesSettingsSchema = z.object({
  shop: browsePageContentSchema,
  categories: browsePageContentSchema,
  themes: browsePageContentSchema,
  collections: browsePageContentSchema,
  collectionsRoomHeading: requiredText(100),
  collectionsStyleHeading: requiredText(100),
});

export const contactSettingsSchema = z.object({
  eyebrow: optionalText(60),
  title: optionalText(100),
  pageIntro: optionalText(300),
  email: z.string().trim().max(150).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone: optionalText(30),
  address: optionalText(300),
  businessHours: optionalText(200),
  formSubmitLabel: optionalText(40),
  formSuccessMessage: optionalText(300),
});

const faqItemSchema = z.object({
  id: z.string().min(1),
  question: requiredText(200),
  answer: requiredText(2000),
  category: optionalText(50),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});
export const faqSettingsSchema = z.object({ items: z.array(faqItemSchema).max(100) });

const policySectionSchema = z.object({
  id: z.string().min(1),
  heading: requiredText(100),
  body: requiredText(2000),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});
export const shippingSettingsSchema = z.object({
  title: requiredText(100),
  sections: z.array(policySectionSchema).max(20),
  freeShippingEnabled: z.boolean(),
  // Module 37: nonnegative (0 is a valid "always free" choice), Infinity/NaN
  // rejected by Number.isFinite the same way Module 34 fixed money fields —
  // an invalid threshold must be a clean 400, never reach the Setting row.
  freeShippingThreshold: z.number().refine((v) => Number.isFinite(v) && v >= 0, "Must be a non-negative number."),
});
export const returnsSettingsSchema = z.object({ title: requiredText(100), sections: z.array(policySectionSchema).max(20) });

const careerListingSchema = z.object({
  id: z.string().min(1),
  title: requiredText(150),
  description: requiredText(2000),
  enabled: z.boolean(),
});
export const careersSettingsSchema = z.object({
  enabled: z.boolean(),
  title: requiredText(150),
  description: optionalText(1000),
  listings: z.array(careerListingSchema).max(30),
});

const productPolicySchema = z.object({
  id: z.string().min(1),
  heading: requiredText(100),
  body: requiredText(2000),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
});

const productBadgeSchema = z.object({
  id: z.enum(["handcrafted", "artisanMade", "sustainablySourced"]),
  title: requiredText(60),
  description: optionalText(300),
  enabled: z.boolean(),
});

const craftsmanshipSchema = z.object({
  enabled: z.boolean(),
  image: optionalUrlOrPath,
  title: requiredText(150),
  body: requiredText(1000),
});

export const productPageSettingsSchema = z.object({
  showRatingReviews: z.boolean(),
  showBuyItNow: z.boolean(),
  showWishlist: z.boolean(),
  showSpecifications: z.boolean(),
  showRelatedProducts: z.boolean(),
  showPolicyInfo: z.boolean(),
  policies: z.array(productPolicySchema).max(20),
  badges: z.array(productBadgeSchema).length(3),
  craftsmanship: craftsmanshipSchema,
});

export const shopSettingsSchema = z.object({
  showFilters: z.boolean(),
  showCategoryFilter: z.boolean(),
  showThemeFilter: z.boolean(),
  showPriceFilter: z.boolean(),
  showSort: z.boolean(),
  productsPerPage: z.union([z.literal(12), z.literal(24), z.literal(48)]),
  gridColumns: z.union([z.literal(3), z.literal(4)]),
  showWishlistOnCards: z.boolean(),
  showAddToCartOnCards: z.boolean(),
  showRatingOnCards: z.boolean(),
});

export const cartSettingsSchema = z.object({
  heading: requiredText(80),
  emptyTitle: requiredText(100),
  emptyDescription: optionalText(300),
  continueShoppingText: requiredText(50),
  showCoupon: z.boolean(),
  showRecommendations: z.boolean(),
});

export const checkoutSettingsSchema = z
  .object({
    heading: requiredText(80),
    placeOrderButtonText: requiredText(50),
    enableCOD: z.boolean(),
    enableOnlinePayment: z.boolean(),
    enableGuestCheckout: z.boolean(),
    enableGiftMessage: z.boolean(),
    enableOrderNotes: z.boolean(),
    allowDifferentBillingAddress: z.boolean(),
  })
  .refine((data) => data.enableCOD || data.enableOnlinePayment, {
    message: "At least one payment method must stay enabled.",
    path: ["enableCOD"],
  });

export const accountSettingsSchema = z.object({
  heading: requiredText(80),
  welcomeMessage: optionalText(200),
  showWishlistTab: z.boolean(),
  showReviewsTab: z.boolean(),
});

const mediaItemSchema = z.object({
  id: z.string().min(1),
  url: z.string().trim().url("Enter a valid URL"),
  altText: optionalText(150),
  label: requiredText(80),
  createdAt: z.string(),
});
export const mediaSettingsSchema = z.object({ items: z.array(mediaItemSchema).max(200) });

export const assignRoleSchema = z.object({
  role: z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "INVENTORY_STAFF",
    "ORDER_MANAGER",
    "SUPPORT_STAFF",
    "MARKETING_STAFF",
    "CUSTOMER",
  ]),
});
