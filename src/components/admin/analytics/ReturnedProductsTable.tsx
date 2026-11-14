import { formatPrice } from "@/lib/utils";
import type { ReturnedProduct } from "@/lib/data/admin-analytics";

export default function ReturnedProductsTable({ products }: { products: ReturnedProduct[] }) {
  if (products.length === 0) {
    return <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No returns in this period.</p>;
  }

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Return Count</th>
            <th className="px-4 py-3">Units Returned</th>
            <th className="px-4 py-3">Returned Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {products.map((p) => (
            <tr key={p.productId}>
              <td className="px-4 py-3 text-ink">{p.name}</td>
              <td className="px-4 py-3 text-ink-700">{p.returnCount}</td>
              <td className="px-4 py-3 text-ink-700">{p.returnedUnits}</td>
              <td className="px-4 py-3 font-medium text-clay">{formatPrice(p.returnedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
