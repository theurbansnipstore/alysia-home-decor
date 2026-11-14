import { formatPrice } from "@/lib/utils";
import type { CategoryPerformance } from "@/lib/data/admin-analytics";

export default function CategoryPerformanceTable({ categories }: { categories: CategoryPerformance[] }) {
  if (categories.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No category sales in this period.</p>;
  }

  const maxRevenue = Math.max(1, ...categories.map((c) => c.revenue));

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Units Sold</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {categories.map((c) => (
            <tr key={c.categoryId}>
              <td className="px-4 py-3 text-ink">{c.name}</td>
              <td className="px-4 py-3 text-ink-700">{c.unitsSold}</td>
              <td className="px-4 py-3 text-ink-700">{c.orders}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{formatPrice(c.revenue)}</span>
                  <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-ink-50 sm:block">
                    <div className="h-full rounded-full bg-brass/70" style={{ width: `${(c.revenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
