import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";

const KEY = "store_homepage";

/**
 * One entry per real, existing homepage section (src/app/page.tsx) — no
 * invented sections. Fields are a superset; each section's admin form and
 * render code only reads the fields that section actually supports (e.g.
 * TrustBadges has no title field, Hero has none of the text fields at all
 * since it's multi-slide) rather than forcing identical fields everywhere.
 */
export interface HomepageSectionSetting {
  id:
    | "hero"
    | "featuredCategoriesRoom"
    | "themeShowcase"
    | "productRailTrending"
    | "storyOurStory"
    | "productRailBestSellers"
    | "storyCraftsmanship"
    | "productRailNewArrivals"
    | "featuredCategoriesAll"
    | "trustBadges"
    | "testimonials"
    | "instagram"
    | "newsletter";
  enabled: boolean;
  order: number;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  body?: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  handle?: string;
  description?: string;
}

/** Module 37 Part 8 — one slide per hero carousel item, previously a hardcoded array (src/lib/mock-data.ts's heroSlides) with no admin control beyond the section's overall enabled flag. */
export interface HeroSlideSetting {
  id: string;
  subtitle: string;
  title: string;
  image: string;
  imageAlt: string;
  ctaText: string;
  ctaLink: string;
  enabled: boolean;
  sortOrder: number;
}

/** Module 37 Part 8 — icon stays code-controlled, keyed by name, matching TrustBadges.tsx's fixed ICONS map (Truck/ShieldCheck/RotateCcw/Sparkles) — admins pick from that fixed set rather than typing an arbitrary icon name. */
export interface TrustBadgeItemSetting {
  id: string;
  icon: "Truck" | "ShieldCheck" | "RotateCcw" | "Sparkles";
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export interface TestimonialItemSetting {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  enabled: boolean;
  sortOrder: number;
}

export interface InstagramItemSetting {
  id: string;
  image: string;
  alt: string;
  link: string;
  enabled: boolean;
  sortOrder: number;
}

export interface HomepageSettings {
  sections: HomepageSectionSetting[];
  heroSlides: HeroSlideSetting[];
  trustBadgeItems: TrustBadgeItemSetting[];
  testimonialItems: TestimonialItemSetting[];
  instagramItems: InstagramItemSetting[];
}

/** Order/defaults match today's src/app/page.tsx exactly. */
export const DEFAULT_HOMEPAGE: HomepageSettings = {
  sections: [
    { id: "hero", enabled: true, order: 0 },
    {
      id: "featuredCategoriesRoom",
      enabled: true,
      order: 1,
      subtitle: "Shop by Room",
      title: "Find your starting point",
    },
    { id: "themeShowcase", enabled: true, order: 2 },
    { id: "productRailTrending", enabled: true, order: 3, title: "Trending Now" },
    {
      id: "storyOurStory",
      enabled: true,
      order: 4,
      eyebrow: "Our story",
      title: "Rooted in craft, made for modern homes",
      body: "Elysia began as a small effort to connect independent artisans across India with homes that value what's made by hand. Every piece carries a little of where it's from.",
      ctaText: "Read our story",
      ctaLink: "/about",
    },
    { id: "productRailBestSellers", enabled: true, order: 5, title: "Best Sellers" },
    {
      id: "storyCraftsmanship",
      enabled: true,
      order: 6,
      eyebrow: "Craftsmanship",
      title: "Made slowly, meant to last",
      body: "From hand-thrown pottery to hand-loomed textiles, each collection is produced in small batches with independent craftspeople — not mass-manufactured.",
      ctaText: "Meet the artisans",
      ctaLink: "/about",
    },
    { id: "productRailNewArrivals", enabled: true, order: 7, title: "New Arrivals" },
    {
      id: "featuredCategoriesAll",
      enabled: true,
      order: 8,
      subtitle: "Every Room, Every Ritual",
      title: "Explore all categories",
    },
    { id: "trustBadges", enabled: true, order: 9 },
    { id: "testimonials", enabled: true, order: 10 },
    { id: "instagram", enabled: true, order: 11, title: "Styled by our community", handle: "@elysia.home" },
    { id: "newsletter", enabled: true, order: 12, title: "Join our circle", description: "New collections, artisan stories, and the occasional considered offer. Nothing else." },
  ],
  // Text/images match what was hardcoded in src/lib/mock-data.ts exactly, so an unconfigured store renders identically to before.
  heroSlides: [
    {
      id: "hero-1",
      subtitle: "New Season · Handcrafted",
      title: "Decor that carries the story of where it's from.",
      image: "https://images.pexels.com/photos/19689230/pexels-photo-19689230.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=1",
      imageAlt: "Warmly lit luxury living room styled with handcrafted decor",
      ctaText: "Shop the collection",
      ctaLink: "/categories",
      enabled: true,
      sortOrder: 0,
    },
    {
      id: "hero-2",
      subtitle: "Festival Edit",
      title: "Bring the warmth of tradition into every room.",
      image: "https://images.pexels.com/photos/4094847/pexels-photo-4094847.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=1",
      imageAlt: "Diya oil lamps arranged for an Indian festive occasion",
      ctaText: "Shop festival collection",
      ctaLink: "/themes/festival-collection",
      enabled: true,
      sortOrder: 1,
    },
    {
      id: "hero-3",
      subtitle: "Artisan Made",
      title: "Ten regional collections, one home.",
      image: "https://images.pexels.com/photos/5824522/pexels-photo-5824522.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&dpr=1",
      imageAlt: "Classic bedroom interior with wooden furniture and antique carpets",
      ctaText: "Meet the artisans",
      ctaLink: "/about",
      enabled: true,
      sortOrder: 2,
    },
  ],
  trustBadgeItems: [
    { id: "tb-shipping", icon: "Truck", label: "Complimentary shipping over ₹2,999", enabled: true, sortOrder: 0 },
    { id: "tb-secure", icon: "ShieldCheck", label: "Secure payments", enabled: true, sortOrder: 1 },
    { id: "tb-returns", icon: "RotateCcw", label: "7-day easy returns", enabled: true, sortOrder: 2 },
    { id: "tb-handmade", icon: "Sparkles", label: "Handcrafted, small-batch quality", enabled: true, sortOrder: 3 },
  ],
  testimonialItems: [
    {
      id: "t-ananya",
      name: "Ananya R.",
      location: "Bengaluru",
      quote: "The brass diyas are even more beautiful in person. You can tell they're handmade — no two are quite the same.",
      rating: 5,
      enabled: true,
      sortOrder: 0,
    },
    {
      id: "t-rohit",
      name: "Rohit K.",
      location: "Pune",
      quote: "Ordered the Warli vase for a housewarming gift and kept it for myself instead. Packaging was excellent too.",
      rating: 5,
      enabled: true,
      sortOrder: 1,
    },
    {
      id: "t-meera",
      name: "Meera S.",
      location: "Delhi",
      quote: "Finally a home decor brand that doesn't feel mass-produced. The Rajasthani collection is stunning.",
      rating: 4,
      enabled: true,
      sortOrder: 2,
    },
  ],
  instagramItems: [
    { id: "ig-1", image: "https://images.pexels.com/photos/5905067/pexels-photo-5905067.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Framed wall art styled above a console table", link: "#", enabled: true, sortOrder: 0 },
    { id: "ig-2", image: "https://images.pexels.com/photos/10699966/pexels-photo-10699966.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Traditional decorative rug in a home interior", link: "#", enabled: true, sortOrder: 1 },
    { id: "ig-3", image: "https://images.pexels.com/photos/13613289/pexels-photo-13613289.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Contemporary pendant lamps in a minimalist interior", link: "#", enabled: true, sortOrder: 2 },
    { id: "ig-4", image: "https://images.pexels.com/photos/19786395/pexels-photo-19786395.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Potted plant beside a wooden mirror", link: "#", enabled: true, sortOrder: 3 },
    { id: "ig-5", image: "https://images.pexels.com/photos/12284838/pexels-photo-12284838.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Vintage-style living room with teal velvet sofa", link: "#", enabled: true, sortOrder: 4 },
    { id: "ig-6", image: "https://images.pexels.com/photos/18688394/pexels-photo-18688394.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1", alt: "Modern minimalist home interior styling", link: "#", enabled: true, sortOrder: 5 },
  ],
};

export async function getHomepageSettings(): Promise<HomepageSettings> {
  return getStoreSetting(KEY, DEFAULT_HOMEPAGE);
}

export async function setHomepageSettings(value: HomepageSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}
