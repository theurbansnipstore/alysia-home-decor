import type { CategoryDTO, ThemeDTO } from "@/types";

interface ProductFiltersProps {
  categories: CategoryDTO[];
  themes: ThemeDTO[];
  current: {
    q?: string;
    status?: string;
    categoryId?: string;
    themeId?: string;
    stockStatus?: string;
    isFeatured?: string;
    isBestSeller?: string;
    isTrending?: string;
    isNewArrival?: string;
    sort?: string;
  };
}

const STATUS_OPTIONS = ["ACTIVE", "DRAFT", "ARCHIVED"];
const STOCK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "out", label: "Out of Stock" },
  { value: "low", label: "Low Stock" },
  { value: "in", label: "In Stock" },
];
const FLAG_OPTIONS: { name: string; label: string }[] = [
  { name: "isNewArrival", label: "New Arrival" },
  { name: "isBestSeller", label: "Best Seller" },
  { name: "isTrending", label: "Trending" },
  { name: "isFeatured", label: "Featured" },
];
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "stock_asc", label: "Stock: Low to High" },
  { value: "stock_desc", label: "Stock: High to Low" },
];

/** Plain GET form — no client JS needed for search/filter/sort. */
export default function ProductFilters({ categories, themes, current }: ProductFiltersProps) {
  return (
    <form
      method="get"
      className="mb-6 grid grid-cols-1 gap-3 border border-ink-100 bg-bone p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs text-ink-500">Search</label>
        <input
          type="text"
          name="q"
          defaultValue={current.q}
          placeholder="Name, SKU, or barcode"
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Status</label>
        <select
          name="status"
          defaultValue={current.status ?? ""}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Category</label>
        <select
          name="categoryId"
          defaultValue={current.categoryId ?? ""}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Theme</label>
        <select
          name="themeId"
          defaultValue={current.themeId ?? ""}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Stock</label>
        <select
          name="stockStatus"
          defaultValue={current.stockStatus ?? ""}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All</option>
          {STOCK_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Sort</label>
        <select
          name="sort"
          defaultValue={current.sort ?? "newest"}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 lg:col-span-5">
        <span className="text-xs text-ink-500">Marketing:</span>
        {FLAG_OPTIONS.map((f) => (
          <label key={f.name} className="flex items-center gap-1.5 text-sm text-ink-700">
            <input type="checkbox" name={f.name} value="true" defaultChecked={current[f.name as keyof typeof current] === "true"} />
            {f.label}
          </label>
        ))}
      </div>

      <div className="flex items-end gap-2 lg:col-span-5">
        <button type="submit" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
          Apply
        </button>
        <a href="/admin/products" className="border border-ink-100 px-5 py-2 text-sm text-ink-700 hover:border-brass">
          Reset
        </a>
      </div>
    </form>
  );
}
