/**
 * Filter/query URL safety (Module 31 Part 16). Ecommerce listing pages
 * (/shop, /categories/[slug], /themes/[slug]) support sort, pagination,
 * and cross-filter query params (?sort=, ?page=, ?theme=, ?category=,
 * ?search=, price range, etc.) — each distinct combination is a distinct
 * URL that would otherwise compete with the clean canonical page for the
 * same content in search results.
 *
 * Policy: the canonical, indexable version of any listing page is the
 * plain base path with NO query string at all. The moment any query
 * parameter is present, the page is marked noindex (still fully
 * crawlable/followable — `follow: true` — so link equity still flows to
 * the products it lists) and its canonical still points back at the clean
 * base path. This is a deliberately simple, easy-to-reason-about rule
 * rather than an allowlist of "safe" params that would need updating every
 * time a new filter is added.
 */
export function hasAnySearchParams(searchParams: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(searchParams).some((key) => searchParams[key] !== undefined);
}
