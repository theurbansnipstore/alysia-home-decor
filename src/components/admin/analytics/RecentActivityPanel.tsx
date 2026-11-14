import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import type { RecentActivity } from "@/lib/data/admin-analytics";

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivityPanel({ data }: { data: RecentActivity }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="border border-ink-100 bg-bone p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Recent Orders</h3>
          <Link href="/admin/orders" className="text-xs text-brass-600 hover:underline">
            View all
          </Link>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="text-xs text-ink-400">No orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-2 text-xs hover:text-brass-600">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-ink">{o.orderNumber}</p>
                    <p className="text-ink-400">{timeAgo(o.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-ink-700">{formatPrice(o.total)}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-ink-100 bg-bone p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">New Customers</h3>
          <Link href="/admin/customers" className="text-xs text-brass-600 hover:underline">
            View all
          </Link>
        </div>
        {data.recentCustomers.length === 0 ? (
          <p className="text-xs text-ink-400">No customers yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate text-ink">{c.name}</p>
                  <p className="truncate text-ink-400">{c.email}</p>
                </div>
                <span className="shrink-0 text-ink-400">{timeAgo(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-ink-100 bg-bone p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Recent Reviews</h3>
          <Link href="/admin/reviews" className="text-xs text-brass-600 hover:underline">
            View all
          </Link>
        </div>
        {data.recentReviews.length === 0 ? (
          <p className="text-xs text-ink-400">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentReviews.map((r) => (
              <li key={r.id} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-ink">{r.productName}</span>
                  <span className="shrink-0 text-brass-600">{"★".repeat(r.rating)}</span>
                </div>
                <p className="text-ink-400">
                  {r.userName} · {timeAgo(r.createdAt)} {!r.isApproved && "· pending"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
