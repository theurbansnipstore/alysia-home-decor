import { getBrandSettings } from "@/lib/config/brand";

/**
 * Deliberately NOT "server-only" — this file has no secrets and no DB
 * access (getBrandSettings() is a plain static object), so it's safe and
 * useful to import from the admin SEO preview (a client component), which
 * reuses this exact function to guarantee the preview matches what
 * generateMetadata() actually renders — never a second, drifting copy of
 * the truncation/precedence logic.
 *
 * SEO precedence resolver (Module 31 Part 6):
 *
 *   Custom SEO value (Product.seoTitle/seoDesc, Category.seoTitle/seoDesc)
 *         ↓
 *   Generated SEO value (from real product/category data)
 *         ↓
 *   Global site default (brand name/tagline)
 *
 * Deliberately the ONLY place this precedence is implemented — every
 * page's generateMetadata() calls one of these functions rather than
 * re-deriving title/description logic itself, so the rule can never drift
 * between pages.
 */

export interface ResolvedSeo {
  title: string;
  description: string;
  /** True for anything that shouldn't be indexed — derived automatically from existing fields (Product.status / Category.isVisible), never a separate manually-set field, per this module's "prefer zero schema changes" mandate. */
  noindex: boolean;
}

/** Exported for admin UI character counters — same numbers the resolver itself truncates at, never a second, drifting limit. */
export const MAX_TITLE_LEN = 60;
export const MAX_DESC_LEN = 160;

function truncate(text: string, max: number): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  // Cut at the last whole word before the limit rather than mid-word.
  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`;
}

interface ProductSeoInput {
  name: string;
  description: string;
  seoTitle: string | null;
  seoDesc: string | null;
  status: string;
  categoryName?: string;
}

export function resolveProductSeo(product: ProductSeoInput): ResolvedSeo {
  const brand = getBrandSettings();

  const generatedTitle = truncate(`${product.name} | ${brand.name}`, MAX_TITLE_LEN);
  const title = product.seoTitle?.trim() || generatedTitle;

  // Generated description is a plain excerpt of the real product
  // description — never invented copy, never keyword-stuffed (Part 6).
  const generatedDescription = truncate(product.description, MAX_DESC_LEN);
  const description = product.seoDesc?.trim() || generatedDescription || `${product.name} — ${brand.tagline}.`;

  return { title, description, noindex: product.status !== "ACTIVE" };
}

interface CategorySeoInput {
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  isVisible: boolean;
}

export function resolveCategorySeo(category: CategorySeoInput): ResolvedSeo {
  const brand = getBrandSettings();

  const generatedTitle = truncate(`${category.name} | ${brand.name}`, MAX_TITLE_LEN);
  const title = category.seoTitle?.trim() || generatedTitle;

  const generatedDescription = category.description ? truncate(category.description, MAX_DESC_LEN) : `Shop ${category.name} at ${brand.name}.`;
  const description = category.seoDesc?.trim() || generatedDescription;

  return { title, description, noindex: !category.isVisible };
}

interface ThemeSeoInput {
  name: string;
  description: string | null;
  isEnabled: boolean;
}

interface PageSeoInput {
  title: string;
  content: string;
  excerpt: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  status: string;
}

/** Module 36 — same three-tier precedence as products/categories: custom → generated → global default. */
export function resolvePageSeo(page: PageSeoInput): ResolvedSeo {
  const brand = getBrandSettings();

  const generatedTitle = truncate(`${page.title} | ${brand.name}`, MAX_TITLE_LEN);
  const title = page.seoTitle?.trim() || generatedTitle;

  const generatedDescription = truncate(page.excerpt?.trim() || page.content, MAX_DESC_LEN);
  const description = page.seoDesc?.trim() || generatedDescription || `${page.title} — ${brand.tagline}.`;

  return { title, description, noindex: page.status !== "PUBLISHED" };
}

/**
 * Theme has no seoTitle/seoDesc columns (pre-existing schema asymmetry —
 * Product and Category both got them in earlier modules, Theme never did).
 * Adding them would be a schema change; themes are a small, generic
 * collection-page surface where a generated title/description is
 * perfectly adequate, so this module does not propose that migration —
 * generated-only, same as the "if existing fields can support SEO
 * sufficiently, use them" instruction, just with one fewer override tier.
 */
export function resolveThemeSeo(theme: ThemeSeoInput): ResolvedSeo {
  const brand = getBrandSettings();
  const title = truncate(`${theme.name} | ${brand.name}`, MAX_TITLE_LEN);
  const description = theme.description ? truncate(theme.description, MAX_DESC_LEN) : `Shop the ${theme.name} collection at ${brand.name}.`;
  return { title, description, noindex: !theme.isEnabled };
}
