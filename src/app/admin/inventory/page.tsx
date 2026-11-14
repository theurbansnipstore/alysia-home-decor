import Link from "next/link";
import { requireRole } from "@/lib/session";
import { STOCK_ADMIN_ROLES, canAdjustStock } from "@/lib/admin/roles";
import { getInventoryStats, getRecentStockMovements, getMovementSource } from "@/lib/inventory/stock-service";
import { getInventoryWatchlist } from "@/lib/data/admin-inventory";

const REASON_LABELS: Record<string, string> = {
  purchase: "Purchase",
  restock: "Restock",
  damage: "Damaged",
  lost: "Lost",
  correction: "Correction",
  return: "Return",
  other: "Other",
  order: "Order placed",
  cancelled: "Order cancelled",
  returned: "Order returned",
};

export default async function InventoryDashboardPage() {
  const session = await requireRole(STOCK_ADMIN_ROLES);

  const [stats, watchlist, recentMovements] = await Promise.all([
    getInventoryStats(),
    getInventoryWatchlist(25),
    getRecentStockMovements(20),
  ]);

  const canAdjust = canAdjustStock(session.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-ink-500">Stock levels and recent movements across the catalog.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/api/admin/inventory/export?format=xlsx" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
            Export Inventory
          </a>
          {canAdjust && (
            <Link href="/admin/inventory/import" className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
              Bulk Adjustment Import
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Products" value={stats.totalProducts} />
        <StatCard label="In Stock" value={stats.inStock} valueClassName="text-green-700" />
        <StatCard
          label="Low Stock"
          value={stats.lowStock}
          valueClassName="text-brass-600"
          href="/admin/products?stockStatus=low"
        />
        <StatCard
          label="Out of Stock"
          value={stats.outOfStock}
          valueClassName="text-clay"
          href="/admin/products?stockStatus=out"
        />
        <StatCard label="Total Units" value={stats.totalUnits} />
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Needs Attention</h2>
        <p className="mb-3 text-xs text-ink-500">Out-of-stock and low-stock products, worst first. Archived products are excluded.</p>
        {watchlist.length === 0 ? (
          <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">
            Nothing needs attention — every product is above its low-stock threshold.
          </p>
        ) : (
          <div className="overflow-x-auto border border-ink-100 bg-bone">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Threshold</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {watchlist.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={canAdjust ? `/admin/products/${p.id}/stock` : `/admin/products/${p.id}`} className="text-brass-600 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{p.sku}</td>
                    <td className={`px-4 py-3 ${p.stockAvailable <= 0 ? "text-clay" : "text-brass-600"}`}>{p.stockAvailable}</td>
                    <td className="px-4 py-3 text-ink-500">{p.lowStockAt}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs ${p.stockAvailable <= 0 ? "bg-clay/10 text-clay" : "bg-brass/10 text-brass-700"}`}
                      >
                        {p.stockAvailable <= 0 ? "OUT OF STOCK" : "LOW STOCK"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg text-ink">Recent Stock Movements</h2>
        {recentMovements.length === 0 ? (
          <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No stock movements yet.</p>
        ) : (
          <div className="overflow-x-auto border border-ink-100 bg-bone">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Change</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Adjusted By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recentMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-ink-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${m.product.id}`} className="text-brass-600 hover:underline">
                        {m.product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{m.product.sku}</td>
                    <td className={`px-4 py-3 ${m.change < 0 ? "text-clay" : "text-green-700"}`}>
                      {m.change > 0 ? `+${m.change}` : m.change}
                    </td>
                    <td className="px-4 py-3 text-ink-700">{REASON_LABELS[m.reason] ?? m.reason}</td>
                    <td className="px-4 py-3 text-ink-500">{getMovementSource(m.reason)}</td>
                    <td className="px-4 py-3 text-ink-500">{m.adjustedByName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClassName,
  href,
}: {
  label: string;
  value: number;
  valueClassName?: string;
  href?: string;
}) {
  const content = (
    <div className="border border-ink-100 bg-bone p-4">
      <p className="text-xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl ${valueClassName ?? "text-ink"}`}>{value.toLocaleString("en-IN")}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-colors hover:border-brass">
      {content}
    </Link>
  ) : (
    content
  );
}
