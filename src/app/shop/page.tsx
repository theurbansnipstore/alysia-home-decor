import type { Metadata } from "next";
import Image from "next/image";
import { getProductCatalog, parseCatalogSearchParams } from "@/lib/data/catalog";
import { getAllCategories } from "@/lib/data/categories";
import { getAllThemes } from "@/lib/data/themes";
import ProductCard from "@/components/ui/ProductCard";
import SortDropdown from "@/components/products/SortDropdown";
import SearchInput from "@/components/products/SearchInput";
import Pagination from "@/components/products/Pagination";
import FilterSidebar from "@/components/categories/FilterSidebar";
import ActiveFilters, { buildActiveFilterChips } from "@/components/products/ActiveFilters";
import Breadcrumb from "@/components/categories/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { getBrandSettings } from "@/lib/config/brand";
import { getShopSettings } from "@/lib/settings/shop";
import { getBrowsePagesSettings } from "@/lib/settings/browse-pages";
import { attachRatings } from "@/lib/data/reviews";
import type { FilterSectionKey } from "@/lib/config/catalog";
import { hasAnySearchParams } from "@/lib/seo/filter-noindex";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * Converted from a static `export const metadata` to `generateMetadata`
 * (Module 31 Part 16) — needed to read `searchParams` and apply the same
 * canonical/noindex filter policy as /categories/[slug] and /themes/[slug].
 * Title/description content is unchanged from the prior static values.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const brand = getBrandSettings();
  const { shop } = await getBrowsePagesSettings();
  const filtered = hasAnySearchParams(searchParams);
  return {
    title: `${shop.seoTitle || "Shop All"} — ${brand.name}`,
    description: shop.seoDesc || `Browse the full ${brand.name} catalog of handcrafted home decor.`,
    alternates: { canonical: "/shop" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const filters = parseCatalogSearchParams(searchParams);
  const categorySlug = typeof searchParams.category === "string" ? searchParams.category : undefined;
  const themeSlug = typeof searchParams.theme === "string" ? searchParams.theme : undefined;

  const [shopSettings, { shop: pageContent }] = await Promise.all([getShopSettings(), getBrowsePagesSettings()]);

  const [{ products: rawProducts, pagination }, categories, themes] = await Promise.all([
    getProductCatalog({ ...filters, categorySlug, themeSlug, pageSize: shopSettings.productsPerPage }),
    getAllCategories(),
    getAllThemes(),
  ]);
  const products = await attachRatings(rawProducts);

  const hiddenSections: FilterSectionKey[] = [];
  if (!shopSettings.showCategoryFilter) hiddenSections.push("category");
  if (!shopSettings.showThemeFilter) hiddenSections.push("theme");
  if (!shopSettings.showPriceFilter) hiddenSections.push("price");
  const gridColsClass = shopSettings.gridColumns === 3 ? "md:grid-cols-3" : "md:grid-cols-3 lg:grid-cols-4";

  const selectedCategory = categories.find((c) => c.slug === categorySlug);
  const selectedTheme = themes.find((t) => t.slug === themeSlug);

  const chips = buildActiveFilterChips({
    basePath: "/shop",
    searchParams,
    categoryName: selectedCategory?.name,
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
    return `/shop?${params.toString()}`;
  }

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", urlPath: "/" },
    { name: "Shop", urlPath: "/shop" },
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <JsonLd data={breadcrumbJsonLd} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />

      {pageContent.heroImage && (
        <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-sm">
          <Image src={pageContent.heroImage} alt={pageContent.title} fill className="object-cover" sizes="100vw" priority />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {pageContent.eyebrow && <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{pageContent.eyebrow}</p>}
          <h1 className="mt-1 font-display text-3xl text-ink sm:text-4xl">{pageContent.title}</h1>
          {pageContent.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{pageContent.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SearchInput basePath="/shop" defaultValue={filters.q} />
          {shopSettings.showSort && <SortDropdown currentSort={filters.sort ?? "newest"} />}
        </div>
      </div>

      <ActiveFilters chips={chips} />

      <div className="flex flex-col gap-10 lg:flex-row">
        {shopSettings.showFilters && (
          <FilterSidebar
            basePath="/shop"
            searchParams={searchParams}
            categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
            themes={themes.map((t) => ({ name: t.name, slug: t.slug }))}
            hiddenSections={hiddenSections}
          />
        )}

        <div className="flex-1">
          {products.length === 0 ? (
            <EmptyState title="No products found" description="Try removing a filter or searching for something else." />
          ) : (
            <>
              <p className="mb-6 text-sm text-ink-500">{pagination.total} products</p>
              <div className={`grid grid-cols-2 gap-x-6 gap-y-10 ${gridColsClass}`}>
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
  );
}
