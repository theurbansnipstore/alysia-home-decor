import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { InventoryInsights } from "@/lib/data/admin-analytics";

export default function InventoryInsightsPanel({ data }: { data: InventoryInsights }) {
  const { stats, inventoryValue, recentMovements } = data;

  return (
    <div className="border border-ink-100 bg-bone p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Total Units</p>
          <p className="mt-1 font-display text-xl text-ink">{stats.totalUnits.toLocaleString("en-IN")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Low Stock</p>
          <p className={`mt-1 font-display text-xl ${stats.lowStock > 0 ? "text-clay" : "text-ink"}`}>{stats.lowStock}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Out of Stock</p>
          <p className={`mt-1 font-display text-xl ${stats.outOfStock > 0 ? "text-clay" : "text-ink"}`}>{stats.outOfStock}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-500">Inventory Value</p>
          <p className="mt-1 font-display text-xl text-ink">{formatPrice(inventoryValue)}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-300">Inventory value = list price × units in stock (excludes archived products). A current snapshot — not filtered by the selected date range.</p>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink">Recent Stock Movements</h3>
        <Link href="/admin/inventory" className="text-xs text-brass-600 hover:underline">
          View inventory
        </Link>
      </div>
      {recentMovements.length === 0 ? (
        <p className="mt-2 text-xs text-ink-400">No stock movements yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink-100">
          {recentMovements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-xs">
              <span className="truncate text-ink-700">{m.product.name}</span>
              <span className={m.change >= 0 ? "text-sage-600" : "text-clay"}>
                {m.change >= 0 ? "+" : ""}
                {m.change}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href="/admin/products" className="mt-4 inline-block text-xs text-brass-600 hover:underline">
        Manage products →
      </Link>
    </div>
  );
}
