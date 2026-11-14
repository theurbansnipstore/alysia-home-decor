import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import PaymentStatusBadge from "@/components/orders/PaymentStatusBadge";
import type { getAdminOrderList } from "@/lib/data/admin-orders";

type AdminOrderRow = Awaited<ReturnType<typeof getAdminOrderList>>["orders"][number];

export default function OrderTable({ orders }: { orders: AdminOrderRow[] }) {
  if (orders.length === 0) {
    return <p className="border border-ink-100 bg-bone p-8 text-center text-sm text-ink-500">No orders match these filters.</p>;
  }

  return (
    <div className="overflow-x-auto border border-ink-100 bg-bone">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Tracking</th>
            <th className="px-4 py-3">Placed</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 font-mono text-xs text-ink">{order.orderNumber}</td>
              <td className="px-4 py-3 text-ink-700">
                <div>{order.customerName}</div>
                <div className="text-xs text-ink-500">{order.customerEmail}</div>
              </td>
              <td className="px-4 py-3 text-ink-700">{formatPrice(order.total.toString())}</td>
              <td className="px-4 py-3">
                <div className="text-xs text-ink-500">{order.paymentMethod}</div>
                {order.payment && <PaymentStatusBadge status={order.payment.status} refundStatus={order.payment.refundStatus} />}
              </td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-xs text-ink-500">
                {order.trackingNumber ? (
                  <>
                    {order.courierName ?? "Courier"}
                    <br />
                    {order.trackingNumber}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-xs text-ink-500">
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(order.createdAt)}
              </td>
              <td className="px-4 py-3">
                <Link href={`/admin/orders/${order.id}`} className="text-brass-600 hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
