import "server-only";
import { absoluteUrl } from "@/lib/seo/site";

/**
 * JSON-LD builders (Module 31 Part 10). Every field here is sourced from
 * real application data passed in by the caller — nothing here invents a
 * rating, review count, address, phone number, or availability value.
 * Callers omit a field entirely (never a placeholder) when the underlying
 * data doesn't exist, since a present-but-fake value is worse than an
 * absent one for a structured-data consumer.
 */

export interface ProductJsonLdInput {
  name: string;
  description: string;
  images: string[];
  sku: string;
  brand: string | null;
  price: string;
  currency: string;
  inStock: boolean;
  urlPath: string;
  /** Only pass when reviews are actually shown for this product on the page
   *  (same gate as the visible rating UI) and count > 0 — structured data
   *  must match what a visitor actually sees, never a fabricated or
   *  stale rating (Module 33). */
  aggregateRating?: { average: number; count: number };
}

export function buildProductJsonLd(input: ProductJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image: input.images,
    sku: input.sku,
    ...(input.brand ? { brand: { "@type": "Brand", name: input.brand } } : {}),
    url: absoluteUrl(input.urlPath),
    ...(input.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.aggregateRating.average,
            reviewCount: input.aggregateRating.count,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: input.currency,
      price: input.price,
      availability: input.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(input.urlPath),
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  urlPath: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.urlPath),
    })),
  };
}

export interface OrganizationJsonLdInput {
  name: string;
  logoPath: string;
  /** Only enabled, non-empty links — never a placeholder/invented handle (Module 31 Part 10, Part 18). */
  sameAs: string[];
}

export function buildOrganizationJsonLd(input: OrganizationJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl(input.logoPath),
    ...(input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
  };
}

/**
 * WebSite + SearchAction (Module 33). `searchPath` must be a real,
 * working search URL that already exists — this reuses /shop?q= (the
 * actual SearchInput on the shop page, see src/components/products/
 * SearchInput.tsx), never an invented endpoint. Enables the sitelinks
 * search box in eligible search results; has no effect on ranking or
 * indexing on its own.
 */
export function buildWebsiteJsonLd(input: { name: string; searchPath: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl(input.searchPath)}={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export interface FaqJsonLdItem {
  question: string;
  answer: string;
}

/** FAQPage (Module 33). Callers must pass only the same items actually
 *  rendered on the page (visible/enabled ones) — structured data mirrors
 *  the DOM, never a superset of it. */
export function buildFaqJsonLd(items: FaqJsonLdItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
