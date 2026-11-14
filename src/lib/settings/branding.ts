import "server-only";
import { getStoreSetting, setStoreSetting } from "@/lib/settings/store-settings";
import { getBrandSettings, type BrandSettings } from "@/lib/config/brand";

const KEY = "store_branding";

export interface BrandingSettings {
  name: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  ogImageUrl: string;
}

/** Matches getBrandSettings()'s current static values exactly, so an unconfigured store looks identical to today. */
export const DEFAULT_BRANDING: BrandingSettings = {
  name: "Elysia",
  tagline: "Handcrafted Home Decor",
  logoUrl: "/logo.svg",
  faviconUrl: "/icon.svg",
  seoDefaultTitle: "Elysia — Handcrafted Home Decor",
  seoDefaultDescription: "Curated home decor and cultural collections, handcrafted by independent artisans across India.",
  ogImageUrl: "",
};

export async function getBrandingSettings(): Promise<BrandingSettings> {
  return getStoreSetting(KEY, DEFAULT_BRANDING);
}

export async function setBrandingSettings(value: BrandingSettings): Promise<void> {
  await setStoreSetting(KEY, value);
}

/**
 * The Setting-aware variant — merges admin-editable name/tagline/logoUrl/
 * faviconUrl over the static defaults from src/lib/config/brand.ts (which
 * stays plain and synchronous so client components like CheckoutForm can
 * keep importing it directly; this file is server-only and lives on the
 * opposite side of that boundary on purpose). Colors/logo dimensions stay
 * code-only. Every static `export const metadata` title across the site
 * still calls the plain getBrandSettings(), unchanged — a disclosed,
 * deliberate scoping limit (static metadata exports can't await), not an
 * oversight. Used by Header/Footer.
 */
export async function getResolvedBrandSettings(): Promise<BrandSettings> {
  const defaults = getBrandSettings();
  const configured = await getBrandingSettings();
  return {
    ...defaults,
    name: configured.name || defaults.name,
    tagline: configured.tagline || defaults.tagline,
    logoUrl: configured.logoUrl || defaults.logoUrl,
    faviconUrl: configured.faviconUrl || defaults.faviconUrl,
  };
}

export interface SiteSeoDefaults {
  title: string;
  description: string;
  ogImage: string;
}

/**
 * Module 36 — wires BrandingSettings.seoDefaultTitle/seoDefaultDescription/
 * ogImageUrl (already collected by the Branding admin form and saved
 * correctly since an earlier module, but never read anywhere) into the
 * root layout's site-wide default metadata. Falls back to the exact same
 * `${name} — ${tagline}` / logoUrl values the root layout used before this
 * existed, so an unconfigured store's <head> is byte-for-byte identical to
 * before this function was introduced.
 */
export async function getSiteSeoDefaults(): Promise<SiteSeoDefaults> {
  const brand = await getResolvedBrandSettings();
  const configured = await getBrandingSettings();
  return {
    title: configured.seoDefaultTitle || `${brand.name} — ${brand.tagline}`,
    description:
      configured.seoDefaultDescription ||
      "Curated home decor and cultural collections, handcrafted by independent artisans across India.",
    ogImage: configured.ogImageUrl || brand.logoUrl,
  };
}
