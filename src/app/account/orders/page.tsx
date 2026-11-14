import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { requireSession } from "@/lib/session";
import { getCustomerOrders } from "@/lib/data/customer-orders";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import PaymentStatusBadge from "@/components/orders/PaymentStatusBadge";
import EmptyState from "@/components/ui/EmptyState";

export default async function AccountOrdersPage() {
  const session = await requireSession();
  const orders = await getCustomerOrders(session.id);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No orders yet"
        description="Your past and current orders will show up here once you place one."
        action={
          <Link href="/shop" className="text-sm text-brass-600 hover:underline">
            Start shopping
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl text-ink">Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="block border border-ink-100 bg-bone p-4 transition-colors hover:border-brass"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-ink">{order.orderNumber}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(order.createdAt)} ·{" "}
                  {order.items.length} item{order.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-ink">{formatPrice(order.total.toString())}</span>
                <span className="text-xs text-ink-300">·</span>
                <span className="text-xs text-ink-500">{order.paymentMethod}</span>
                {order.payment && <PaymentStatusBadge status={order.payment.status} refundStatus={order.payment.refundStatus} />}
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            {(order.trackingNumber || order.courierName) && (
              <p className="mt-2 text-xs text-ink-500">
                {order.courierName ?? "Courier"}
                {order.trackingNumber && ` · ${order.trackingNumber}`}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
