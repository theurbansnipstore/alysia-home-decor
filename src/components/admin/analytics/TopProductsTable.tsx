import { formatPrice } from "@/lib/utils";
import type { TopProduct } from "@/lib/data/admin-analytics";

export default function TopProductsTable({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No product sales in this period.</p>;
  }

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Units Sold</th>
            <th className="px-4 py-3">Orders</th>
            <th className="px-4 py-3">Avg. Price</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Stock Left</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {products.map((p) => (
            <tr key={p.productId}>
              <td className="px-4 py-3 text-ink">{p.name}</td>
              <td className="px-4 py-3 text-ink-500">{p.categoryName}</td>
              <td className="px-4 py-3 text-ink-700">{p.unitsSold}</td>
              <td className="px-4 py-3 text-ink-700">{p.orders}</td>
              <td className="px-4 py-3 text-ink-700">{formatPrice(p.avgSellingPrice)}</td>
              <td className="px-4 py-3 font-medium text-ink">{formatPrice(p.revenue)}</td>
              <td className="px-4 py-3 text-ink-500">{p.stockAvailable ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
