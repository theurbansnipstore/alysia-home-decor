import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import type { OrdersAnalytics } from "@/lib/data/admin-analytics";

export default function OrdersStatusPanel({ data }: { data: OrdersAnalytics }) {
  const total = data.byStatus.reduce((sum, s) => sum + s.count, 0);
  const sorted = [...data.byStatus].sort((a, b) => b.count - a.count);

  return (
    <div className="border border-ink-100 bg-bone p-4">
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-ink-400">No orders in this period.</p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((s) => (
            <li key={s.status} className="flex items-center gap-3">
              <div className="w-32 shrink-0 sm:w-40">
                <OrderStatusBadge status={s.status} />
              </div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-50">
                <div className="h-full rounded-full bg-brass/70" style={{ width: `${(s.count / total) * 100}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-sm text-ink-700">{s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
