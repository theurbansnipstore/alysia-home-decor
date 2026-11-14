import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getThemeBySlug } from "@/lib/data/themes";
import { getAllCategories } from "@/lib/data/categories";
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
import { resolveThemeSeo } from "@/lib/seo/resolve";
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
  const theme = await getThemeBySlug(params.slug);
  if (!theme) return {};
  const seo = resolveThemeSeo({ name: theme.name, description: theme.description ?? null, isEnabled: true });
  const urlPath = `/themes/${theme.slug}`;
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
      ...(theme.banner ? { images: [{ url: theme.banner }] } : {}),
    },
    twitter: { card: theme.banner ? "summary_large_image" : "summary", title: seo.title, description: seo.description },
  };
}

export default async function ThemeDetailPage({ params, searchParams }: Props) {
  const theme = await getThemeBySlug(params.slug);
  if (!theme) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", urlPath: "/" },
    { name: "Themes", urlPath: "/themes" },
    { name: theme.name, urlPath: `/themes/${theme.slug}` },
  ]);

  const filters = parseCatalogSearchParams(searchParams);
  const basePath = `/themes/${theme.slug}`;
  const categorySlug = typeof searchParams.category === "string" ? searchParams.category : undefined;

  const [{ products: rawProducts, pagination }, categories, shopSettings] = await Promise.all([
    getProductCatalog({ ...filters, themeSlug: theme.slug, categorySlug }),
    getAllCategories(),
    getShopSettings(),
  ]);
  const products = await attachRatings(rawProducts);

  // Module 38 Part 4: same fix as /categories/[slug] — this page reuses
  // FilterSidebar/SortDropdown too, so it now honors the same Shop
  // settings instead of always rendering every filter unconditionally.
  const hiddenSections: FilterSectionKey[] = ["theme"];
  if (!shopSettings.showCategoryFilter) hiddenSections.push("category");
  if (!shopSettings.showPriceFilter) hiddenSections.push("price");

  const selectedCategory = categories.find((c) => c.slug === categorySlug);

  const chips = buildActiveFilterChips({
    basePath,
    searchParams,
    lockTheme: true,
    categoryName: selectedCategory?.name,
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
      <CollectionBanner title={theme.name} image={theme.banner} description={theme.description} />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Themes", href: "/themes" }, { label: theme.name }]}
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
              categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
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
