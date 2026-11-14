import type { Metadata } from "next";
import HeroCarousel from "@/components/home/HeroCarousel";
import FeaturedCategories from "@/components/home/FeaturedCategories";
import ThemeShowcase from "@/components/home/ThemeShowcase";
import ProductRail from "@/components/home/ProductRail";
import StorySection from "@/components/home/StorySection";
import TrustBadges from "@/components/home/TrustBadges";
import Testimonials from "@/components/home/Testimonials";
import InstagramGallery from "@/components/home/InstagramGallery";
import Newsletter from "@/components/home/Newsletter";
import FadeIn from "@/components/ui/FadeIn";
import { storyImages } from "@/lib/mock-data";
import { getHomepageSettings, type HomepageSectionSetting } from "@/lib/settings/homepage";
import { getProductCatalog } from "@/lib/data/catalog";
import { attachRatings } from "@/lib/data/reviews";
import { getAllCategories } from "@/lib/data/categories";
import { getAllThemes } from "@/lib/data/themes";

const RAIL_SIZE = 8;

// Homepage had no metadata export at all — it silently inherited the root
// layout's title/description/OG (which is correct content-wise) but never
// got its own canonical tag (Module 33). Setting only `alternates` here
// leaves title/description/OG exactly as they were, inherited unchanged.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [{ sections, heroSlides, trustBadgeItems, testimonialItems, instagramItems }, categories, themes] = await Promise.all([
    getHomepageSettings(),
    getAllCategories(),
    getAllThemes(),
  ]);
  const byId = new Map(sections.map((s) => [s.id, s]));
  const isOn = (id: HomepageSectionSetting["id"]) => byId.get(id)?.enabled ?? true;
  const order = [...sections].sort((a, b) => a.order - b.order).map((s) => s.id);

  const enabledHeroSlides = heroSlides.filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledTrustBadges = trustBadgeItems.filter((b) => b.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledTestimonials = testimonialItems.filter((t) => t.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  const enabledInstagramItems = instagramItems.filter((i) => i.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  // Real, DB-backed selections for the three product rails — replaces the
  // old mock arrays (whose ids never matched real products). Each reuses
  // the same catalog engine /shop already uses, so a rail's "View all"
  // link filters to exactly the products shown here.
  // - Trending: admin-curated (Product.isTrending), no automatic signal
  //   for "trending" exists in this codebase.
  // - Best Sellers: automatically computed from real order history
  //   (existing sort=best_selling → orderItems count desc), not the manual
  //   isBestSeller flag — that flag still separately drives the /shop
  //   filter chip and product-card ribbon, unchanged.
  // - New Arrivals: admin-curated (Product.isNewArrival), the existing
  //   convention already used by the /shop badge filter and card ribbon.
  const needsTrending = isOn("productRailTrending");
  const needsBestSellers = isOn("productRailBestSellers");
  const needsNewArrivals = isOn("productRailNewArrivals");

  const [trendingResult, bestSellerResult, newArrivalResult] = await Promise.all([
    needsTrending ? getProductCatalog({ badges: ["trending"], sort: "newest", pageSize: RAIL_SIZE }) : null,
    needsBestSellers ? getProductCatalog({ sort: "best_selling", pageSize: RAIL_SIZE }) : null,
    needsNewArrivals ? getProductCatalog({ badges: ["newArrival"], sort: "newest", pageSize: RAIL_SIZE }) : null,
  ]);

  const [trendingProducts, bestSellerProducts, newArrivalProducts] = await Promise.all([
    trendingResult ? attachRatings(trendingResult.products) : [],
    bestSellerResult ? attachRatings(bestSellerResult.products) : [],
    newArrivalResult ? attachRatings(newArrivalResult.products) : [],
  ]);

  const renderers: Partial<Record<HomepageSectionSetting["id"], () => JSX.Element | null>> = {
    hero: () => <HeroCarousel slides={enabledHeroSlides} />,
    featuredCategoriesRoom: () => {
      const s = byId.get("featuredCategoriesRoom");
      return (
        <FeaturedCategories
          categories={categories}
          subtitle={s?.subtitle || "Shop by Room"}
          title={s?.title || "Find your starting point"}
          limit={6}
        />
      );
    },
    themeShowcase: () => {
      const s = byId.get("themeShowcase");
      return <ThemeShowcase themes={themes} subtitle={s?.subtitle} title={s?.title} />;
    },
    productRailTrending: () => {
      const s = byId.get("productRailTrending");
      return <ProductRail title={s?.title || "Trending Now"} href="/shop?badge=trending" products={trendingProducts} />;
    },
    storyOurStory: () => {
      const s = byId.get("storyOurStory");
      return (
        <StorySection
          eyebrow={s?.eyebrow || "Our story"}
          title={s?.title || "Rooted in craft, made for modern homes"}
          body={
            s?.body ||
            "Elysia began as a small effort to connect independent artisans across India with homes that value what's made by hand. Every piece carries a little of where it's from."
          }
          image={s?.image || storyImages.ourStory.url}
          imageAlt={storyImages.ourStory.alt}
          ctaText={s?.ctaText || "Read our story"}
          ctaLink={s?.ctaLink || "/about"}
        />
      );
    },
    productRailBestSellers: () => {
      const s = byId.get("productRailBestSellers");
      return <ProductRail title={s?.title || "Best Sellers"} href="/shop?sort=best_selling" products={bestSellerProducts} />;
    },
    storyCraftsmanship: () => {
      const s = byId.get("storyCraftsmanship");
      return (
        <StorySection
          eyebrow={s?.eyebrow || "Craftsmanship"}
          title={s?.title || "Made slowly, meant to last"}
          body={
            s?.body ||
            "From hand-thrown pottery to hand-loomed textiles, each collection is produced in small batches with independent craftspeople — not mass-manufactured."
          }
          image={s?.image || storyImages.craftsmanship.url}
          imageAlt={storyImages.craftsmanship.alt}
          ctaText={s?.ctaText || "Meet the artisans"}
          ctaLink={s?.ctaLink || "/about"}
          reverse
        />
      );
    },
    productRailNewArrivals: () => {
      const s = byId.get("productRailNewArrivals");
      return <ProductRail title={s?.title || "New Arrivals"} href="/shop?badge=newArrival" products={newArrivalProducts} />;
    },
    featuredCategoriesAll: () => {
      const s = byId.get("featuredCategoriesAll");
      return (
        <FeaturedCategories
          categories={categories}
          subtitle={s?.subtitle || "Every Room, Every Ritual"}
          title={s?.title || "Explore all categories"}
          limit={10}
        />
      );
    },
    trustBadges: () => <TrustBadges badges={enabledTrustBadges} />,
    testimonials: () => <Testimonials testimonials={enabledTestimonials} />,
    instagram: () => {
      const s = byId.get("instagram");
      return <InstagramGallery posts={enabledInstagramItems} handle={s?.handle} title={s?.title} />;
    },
    newsletter: () => {
      const s = byId.get("newsletter");
      return <Newsletter variant="full" title={s?.title} description={s?.description} />;
    },
  };

  return (
    <>
      {order.map((id) => {
        if (!isOn(id)) return null;
        const render = renderers[id];
        if (!render) return null;
        return <FadeIn key={id}>{render()}</FadeIn>;
      })}
    </>
  );
}
