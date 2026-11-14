interface ReviewFiltersProps {
  current: {
    q?: string;
    status?: string;
    rating?: string;
  };
}

/** Plain GET form — no client JS needed for search/filter, mirrors ProductFilters. */
export default function ReviewFilters({ current }: ReviewFiltersProps) {
  return (
    <form
      method="get"
      className="mb-6 grid grid-cols-1 gap-3 border border-ink-100 bg-bone p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs text-ink-500">Search</label>
        <input
          type="text"
          name="q"
          defaultValue={current.q}
          placeholder="Product, customer, or review text"
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
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Rating</label>
        <select
          name="rating"
          defaultValue={current.rating ?? ""}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        >
          <option value="">All</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} star{r === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 lg:col-span-4">
        <button type="submit" className="border border-ink bg-ink px-5 py-2 text-sm text-bone-100 hover:bg-ink-700">
          Apply
        </button>
        <a href="/admin/reviews" className="border border-ink-100 px-5 py-2 text-sm text-ink-700 hover:border-brass">
          Reset
        </a>
      </div>
    </form>
  );
}
