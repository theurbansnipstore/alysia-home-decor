import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PRODUCT_AREA_ROLES, canManageProducts } from "@/lib/admin/roles";
import { getAdminProductList, type AdminSortKey } from "@/lib/data/admin-products";
import { getAllCategoriesAdmin } from "@/lib/data/categories";
import { getAllThemesAdmin } from "@/lib/data/themes";
import type { StockStatus } from "@/lib/inventory/stock-service";
import ProductFilters from "@/components/admin/products/ProductFilters";
import ProductTable from "@/components/admin/products/ProductTable";
import Pagination from "@/components/products/Pagination";
import type { ProductStatus } from "@prisma/client";

interface Props {
  searchParams: Record<string, string | undefined>;
}

interface QueryableFilters {
  q?: string;
  status?: string;
  categoryId?: string;
  themeId?: string;
  stockStatus?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  sort?: string;
}

function filterQueryString(filters: QueryableFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.themeId) params.set("themeId", filters.themeId);
  if (filters.stockStatus) params.set("stockStatus", filters.stockStatus);
  if (filters.isFeatured) params.set("isFeatured", "true");
  if (filters.isBestSeller) params.set("isBestSeller", "true");
  if (filters.isTrending) params.set("isTrending", "true");
  if (filters.isNewArrival) params.set("isNewArrival", "true");
  return params.toString();
}

const STOCK_STATUS_KEYS: StockStatus[] = ["out", "low", "in"];

export default async function AdminProductsPage({ searchParams }: Props) {
  const session = await requireRole(PRODUCT_AREA_ROLES);

  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const filters = {
    q: searchParams.q || undefined,
    status: (searchParams.status as ProductStatus) || undefined,
    categoryId: searchParams.categoryId || undefined,
    themeId: searchParams.themeId || undefined,
    stockStatus: STOCK_STATUS_KEYS.includes(searchParams.stockStatus as StockStatus)
      ? (searchParams.stockStatus as StockStatus)
      : undefined,
    isFeatured: searchParams.isFeatured === "true" ? true : undefined,
    isBestSeller: searchParams.isBestSeller === "true" ? true : undefined,
    isTrending: searchParams.isTrending === "true" ? true : undefined,
    isNewArrival: searchParams.isNewArrival === "true" ? true : undefined,
    sort: (searchParams.sort as AdminSortKey) || undefined,
    page,
  };

  const [{ products, pagination }, categories, themes] = await Promise.all([
    getAdminProductList(filters),
    getAllCategoriesAdmin(),
    getAllThemesAdmin(),
  ]);

  function buildHref(p: number) {
    const params = new URLSearchParams(filterQueryString(filters));
    if (filters.sort) params.set("sort", filters.sort);
    params.set("page", String(p));
    return `/admin/products?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Products</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/products/export?scope=filtered&format=csv&${filterQueryString(filters)}`}
            className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
          >
            Export Filtered (CSV)
          </a>
          <a href="/api/admin/products/export?scope=all&format=csv" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
            Export All (CSV)
          </a>
          <a href="/api/admin/products/export?scope=all&format=xlsx" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
            Export All (XLSX)
          </a>
          {canManageProducts(session.role) && (
            <>
              <Link href="/admin/products/import" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
                Import
              </Link>
              <Link href="/admin/products/images/bulk" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
                Bulk Images
              </Link>
              <Link href="/admin/products/new" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
                New Product
              </Link>
            </>
          )}
        </div>
      </div>

      <ProductFilters categories={categories} themes={themes} current={searchParams} />

      <p className="mb-3 text-xs text-ink-500">{pagination.total} product{pagination.total === 1 ? "" : "s"}</p>

      <ProductTable
        products={products}
        role={session.role}
        totalMatching={pagination.total}
        activeFilters={{
          q: filters.q,
          status: filters.status,
          categoryId: filters.categoryId,
          themeId: filters.themeId,
          stockStatus: filters.stockStatus,
          isFeatured: filters.isFeatured,
          isBestSeller: filters.isBestSeller,
          isTrending: filters.isTrending,
          isNewArrival: filters.isNewArrival,
        }}
        categories={categories}
        themes={themes}
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} buildHref={buildHref} />
    </div>
  );
}
