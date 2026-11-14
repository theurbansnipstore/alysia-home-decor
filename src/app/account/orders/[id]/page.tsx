import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getCustomerOrderById } from "@/lib/data/customer-orders";
import { getCustomerOrderTimeline } from "@/lib/orders/order-timeline";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import PaymentStatusBadge from "@/components/orders/PaymentStatusBadge";
import OrderTimeline from "@/components/orders/OrderTimeline";
import type { AddressSnapshot } from "@/lib/checkout/snapshot";

function AddressBlock({ label, address }: { label: string; address: AddressSnapshot }) {
  return (
    <div>
      <h3 className="mb-1 text-xs uppercase tracking-wide text-ink-500">{label}</h3>
      <p className="text-sm text-ink-700">
        {address.fullName}
        <br />
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
        <br />
        {address.city}, {address.state} {address.pincode}
        <br />
        {address.country}
        <br />
        {address.phone}
      </p>
    </div>
  );
}

export default async function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  // Ownership check happens inside getCustomerOrderById() — never trust the
  // URL id alone. "Not mine" and "doesn't exist" both land here as notFound().
  const order = await getCustomerOrderById(session.id, params.id);
  if (!order) notFound();
  const milestones = await getCustomerOrderTimeline(order.id);

  const shippingAddress = order.shippingAddress as unknown as AddressSnapshot;
  const billingAddress = order.billingAddress as unknown as AddressSnapshot;
  const sameAddress = JSON.stringify(order.shippingAddress) === JSON.stringify(order.billingAddress);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/account/orders" className="text-sm text-brass-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{order.orderNumber}</h1>
          <p className="text-sm text-ink-500">
            Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {order.payment && <PaymentStatusBadge status={order.payment.status} refundStatus={order.payment.refundStatus} />}
        </div>
      </div>

      {(order.trackingNumber || order.courierName) && (
        <section className="border border-ink-100 bg-bone-100 p-4">
          <h3 className="mb-1 text-xs uppercase tracking-wide text-ink-500">Tracking</h3>
          <p className="text-sm text-ink-700">
            {order.courierName ?? "Courier"}
            {order.trackingNumber && ` · ${order.trackingNumber}`}
          </p>
        </section>
      )}

      <OrderTimeline placedAt={order.createdAt} milestones={milestones} />

      <section className="border border-ink-100 bg-bone p-5">
        <h2 className="mb-3 font-display text-base text-ink">Items</h2>
        <div className="divide-y divide-ink-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div>
                <p className="text-ink">{item.name}</p>
                <p className="text-xs text-ink-500">Qty {item.quantity}</p>
              </div>
              <p className="font-mono text-ink-700">{formatPrice(item.price.toString())}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between text-ink-500">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(order.subtotal.toString())}</span>
          </div>
          <div className="flex justify-between text-ink-500">
            <span>Shipping</span>
            <span className="font-mono">{formatPrice(order.shippingCharge.toString())}</span>
          </div>
          {parseFloat(order.taxAmount.toString()) > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Tax</span>
              <span className="font-mono">{formatPrice(order.taxAmount.toString())}</span>
            </div>
          )}
          {parseFloat(order.discountAmount.toString()) > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Discount</span>
              <span className="font-mono">-{formatPrice(order.discountAmount.toString())}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 text-base text-ink">
            <span>Total</span>
            <span className="font-mono">{formatPrice(order.total.toString())}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 border border-ink-100 bg-bone p-5 sm:grid-cols-2">
        <AddressBlock label="Shipping Address" address={shippingAddress} />
        <AddressBlock label={sameAddress ? "Billing Address (same as shipping)" : "Billing Address"} address={billingAddress} />
      </section>

      <section className="border border-ink-100 bg-bone p-5 text-sm">
        <h2 className="mb-2 font-display text-base text-ink">Payment</h2>
        <p className="text-ink-700">
          {order.paymentMethod}
          {order.payment && <> · <PaymentStatusBadge status={order.payment.status} refundStatus={order.payment.refundStatus} /></>}
        </p>
      </section>
    </div>
  );
}
