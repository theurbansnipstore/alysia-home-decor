import Link from "next/link";
import { requireRole } from "@/lib/session";
import { DASHBOARD_OVERVIEW_ROLES } from "@/lib/admin/dashboard-roles";
import { getDashboardOverview } from "@/lib/data/admin-dashboard";
import { formatPrice } from "@/lib/utils";
import DashboardKpiCard from "@/components/admin/DashboardKpiCard";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";

export default async function AdminOverviewPage() {
  await requireRole(DASHBOARD_OVERVIEW_ROLES);
  const data = await getDashboardOverview();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
        <Link href="/admin/analytics" className="text-xs text-brass-600 hover:underline">
          View full analytics →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <DashboardKpiCard label="Sales" value={formatPrice(data.totalSales)} href="/admin/orders" />
        <DashboardKpiCard label="Orders" value={data.orderCount} href="/admin/orders" />
        <DashboardKpiCard label="Products" value={data.productCount} href="/admin/products" />
        <DashboardKpiCard label="Customers" value={data.customerCount} href="/admin/customers" />
        <DashboardKpiCard
          label="Low Stock"
          value={data.lowStockCount}
          href="/admin/products"
          warn={data.lowStockCount > 0}
        />
        <DashboardKpiCard
          label="Pending Reviews"
          value={data.pendingReviewCount}
          href="/admin/reviews"
          warn={data.pendingReviewCount > 0}
        />
      </div>

      {data.outOfStockCount > 0 && (
        <p className="mt-4 text-xs text-clay">
          {data.outOfStockCount} product{data.outOfStockCount === 1 ? " is" : "s are"} completely out of stock.
        </p>
      )}

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs text-brass-600 hover:underline">
              View all
            </Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No orders yet.</p>
          ) : (
            <div className="divide-y divide-ink-100 border border-ink-100 bg-bone">
              {data.recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-bone-200"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-ink">{o.orderNumber}</p>
                    <p className="truncate text-xs text-ink-500">{o.customerName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-ink">{formatPrice(o.total)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Low Stock</h2>
            <Link href="/admin/products" className="text-xs text-brass-600 hover:underline">
              View all
            </Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">Nothing low on stock.</p>
          ) : (
            <div className="divide-y divide-ink-100 border border-ink-100 bg-bone">
              {data.lowStockProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}/stock`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-bone-200"
                >
                  <span className="text-ink">{p.name}</span>
                  <span className="text-clay">{p.stockAvailable} left</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
