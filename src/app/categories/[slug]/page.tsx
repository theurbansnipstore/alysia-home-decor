import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getAllThemes } from "@/lib/data/themes";
import { getProductCatalog, parseCatalogSearchParams } from "@/lib/data/catalog";
import CollectionBanner from "@/components/categories/CollectionBanner";
import Breadcrumb from "@/components/categories/Breadcrumb";
import FilterSidebar from "@/components/categories/FilterSidebar";
import SortDropdown from "@/components/products/SortDropdown";
import ActiveFilters, { buildActiveFilterChips } from "@/components/products/ActiveFilters";
import ProductCard from "@/components/ui/ProductCard";
import Pagination from "@/components/products/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import { attachRatings } from "@/lib/data/reviews";
import { resolveCategorySeo } from "@/lib/seo/resolve";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { hasAnySearchParams } from "@/lib/seo/filter-noindex";
import JsonLd from "@/components/seo/JsonLd";
import { getShopSettings } from "@/lib/settings/shop";
import type { FilterSectionKey } from "@/lib/config/catalog";

interface Props {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) return {};
  // getCategoryBySlug() already filters to isVisible-only, so this page
  // only ever exists for a visible category — noindex here would never
  // trigger, but resolveCategorySeo() stays the single source of truth
  // rather than this page re-deriving the rule.
  const seo = resolveCategorySeo({ name: category.name, description: category.description ?? null, seoTitle: category.seoTitle ?? null, seoDesc: category.seoDesc ?? null, isVisible: true });
  const urlPath = `/categories/${category.slug}`;
  const filtered = hasAnySearchParams(searchParams);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: urlPath },
    robots: filtered ? { index: false, follow: true } : undefined,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: urlPath,
      type: "website",
      ...(category.image ? { images: [{ url: category.image }] } : {}),
    },
    twitter: { card: category.image ? "summary_large_image" : "summary", title: seo.title, description: seo.description },
  };
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug(params.slug);
  if (!category) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", urlPath: "/" },
    { name: "Categories", urlPath: "/categories" },
    { name: category.name, urlPath: `/categories/${category.slug}` },
  ]);

  const filters = parseCatalogSearchParams(searchParams);
  const basePath = `/categories/${category.slug}`;
  const themeSlug = typeof searchParams.theme === "string" ? searchParams.theme : undefined;

  const [{ products: rawProducts, pagination }, themes, shopSettings] = await Promise.all([
    getProductCatalog({ ...filters, categorySlug: category.slug, themeSlug }),
    getAllThemes(),
    getShopSettings(),
  ]);
  const products = await attachRatings(rawProducts);

  // Module 38 Part 4: this page reuses the exact same FilterSidebar/
  // SortDropdown components /shop uses, so it now reads the same
  // showFilters/showThemeFilter/showPriceFilter/showSort settings — an
  // admin turning a filter off on the Shop settings screen previously had
  // no effect here, which is the bug the user reported. "category" stays
  // permanently hidden regardless of the setting: this page IS a single
  // category, so a category filter within it would be meaningless, not a
  // toggle-controlled feature.
  const hiddenSections: FilterSectionKey[] = ["category"];
  if (!shopSettings.showThemeFilter) hiddenSections.push("theme");
  if (!shopSettings.showPriceFilter) hiddenSections.push("price");

  const selectedTheme = themes.find((t) => t.slug === themeSlug);

  const chips = buildActiveFilterChips({
    basePath,
    searchParams,
    lockCategory: true,
    themeName: selectedTheme?.name,
  });

  function buildHref(p: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page") continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else if (value !== undefined) params.set(key, value);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div>
      <JsonLd data={breadcrumbJsonLd} />
      <CollectionBanner title={category.name} image={category.image} description={category.description} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Categories", href: "/categories" },
            { label: category.name },
          ]}
        />

        <div className="mb-6 flex justify-end">
          {shopSettings.showSort && <SortDropdown currentSort={filters.sort ?? "newest"} />}
        </div>

        <ActiveFilters chips={chips} />

        <div className="flex flex-col gap-10 lg:flex-row">
          {shopSettings.showFilters && (
            <FilterSidebar
              basePath={basePath}
              searchParams={searchParams}
              themes={themes.map((t) => ({ name: t.name, slug: t.slug }))}
              hiddenSections={hiddenSections}
            />
          )}

          <div className="flex-1">
            {products.length === 0 ? (
              <EmptyState title="No products found" description="Try removing a filter." />
            ) : (
              <>
                <p className="mb-6 text-sm text-ink-500">{pagination.total} products</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                <Pagination page={pagination.page} totalPages={pagination.totalPages} buildHref={buildHref} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
