import "server-only";
import { getBrandingSettings } from "@/lib/settings/branding";
import { getHomepageSettings } from "@/lib/settings/homepage";
import { getBrowsePagesSettings } from "@/lib/settings/browse-pages";
import { getProductPageSettings } from "@/lib/settings/product-page";

/**
 * Media items are a plain URL registry (see media.ts) — there's no foreign
 * key anywhere linking a CMS field back to a MediaItemSetting.id, since
 * every image field elsewhere just stores a plain string URL, whether or
 * not it was originally copied from Media. So "is this used" can only be
 * an exact-URL-string scan across every settings domain that has an image
 * field, listed here by hand. This is a best-effort safety net for the
 * admin UI (Module 38 Part 2's "don't silently delete a referenced image"
 * requirement) — it can't catch a URL used outside these known fields
 * (e.g. pasted directly into a Page's rich-text body), which is disclosed
 * in the Media screen's own copy, not hidden.
 */
export async function findMediaUsages(url: string): Promise<string[]> {
  if (!url) return [];
  const usages: string[] = [];

  const [branding, homepage, browsePages, productPage] = await Promise.all([
    getBrandingSettings(),
    getHomepageSettings(),
    getBrowsePagesSettings(),
    getProductPageSettings(),
  ]);

  if (branding.logoUrl === url) usages.push("Branding → Logo URL");
  if (branding.faviconUrl === url) usages.push("Branding → Favicon URL");
  if (branding.ogImageUrl === url) usages.push("Branding → Default Social Share Image");

  homepage.heroSlides.forEach((slide, i) => {
    if (slide.image === url) usages.push(`Homepage → Hero Slide ${i + 1} ("${slide.title || "untitled"}")`);
  });
  homepage.instagramItems.forEach((item, i) => {
    if (item.image === url) usages.push(`Homepage → Instagram Post ${i + 1}`);
  });

  (["shop", "categories", "themes", "collections"] as const).forEach((key) => {
    if (browsePages[key].heroImage === url) {
      usages.push(`${key[0].toUpperCase()}${key.slice(1)} Page → Hero Image`);
    }
  });

  if (productPage.craftsmanship.image === url) {
    usages.push("Product Page → Materials & Craftsmanship Image");
  }

  return usages;
}
