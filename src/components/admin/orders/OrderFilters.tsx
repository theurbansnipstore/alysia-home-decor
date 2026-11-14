interface OrderFiltersProps {
  current: {
    q?: string;
    status?: string;
    sort?: string;
  };
}

const STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "total_desc", label: "Total: High to Low" },
  { value: "total_asc", label: "Total: Low to High" },
];

/** Plain GET form — mirrors src/components/admin/products/ProductFilters.tsx, no client JS needed. */
export default function OrderFilters({ current }: OrderFiltersProps) {
  return (
    <form method="get" className="mb-6 grid grid-cols-1 gap-3 border border-ink-100 bg-bone p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs text-ink-500">Search</label>
        <input
          type="text"
          name="q"
          defaultValue={current.q}
          placeholder="Order number or customer email"
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
              {s.replace(/_/g, " ")}
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

      <div className="flex items-end gap-2 lg:col-span-4">
        <button type="submit" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
          Apply
        </button>
        <a href="/admin/orders" className="border border-ink-100 px-5 py-2 text-sm text-ink-700 hover:border-brass">
          Reset
        </a>
      </div>
    </form>
  );
}
