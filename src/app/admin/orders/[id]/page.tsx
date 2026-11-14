import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { ORDER_AREA_ROLES, canManageOrders } from "@/lib/admin/order-roles";
import { getAdminOrderById } from "@/lib/data/admin-orders";
import { ORDER_STATUS_TRANSITIONS } from "@/lib/orders/status-service";
import { getOrderActivityTimeline } from "@/lib/orders/order-timeline";
import { getRefundEligibility } from "@/lib/integrations/payment/razorpay-refund";
import { formatPrice } from "@/lib/utils";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import PaymentStatusBadge from "@/components/orders/PaymentStatusBadge";
import StatusUpdateForm from "@/components/admin/orders/StatusUpdateForm";
import AdminOrderTimeline from "@/components/admin/orders/AdminOrderTimeline";
import RefundPanel from "@/components/admin/orders/RefundPanel";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import type { AddressSnapshot } from "@/lib/checkout/snapshot";
import type { OrderReturnReason } from "@prisma/client";

const STATUS_REASON_LABELS: Record<OrderReturnReason, string> = {
  CUSTOMER_REFUSED_COD: "Customer refused / did not accept COD delivery",
  CUSTOMER_REQUESTED_RETURN: "Customer requested return (received the product)",
  DELIVERY_FAILURE: "Delivery failure (courier / address issue)",
  DAMAGED: "Damaged in transit",
  OTHER: "Other",
  CUSTOMER_REQUESTED_CANCELLATION: "Customer requested cancellation",
  PAYMENT_ISSUE: "Payment issue",
  ADDRESS_ISSUE: "Address issue",
  SELLER_UNABLE_TO_FULFILL: "Seller unable to fulfill",
  PRODUCT_UNAVAILABLE: "Product unavailable",
};

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

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole(ORDER_AREA_ROLES);

  const order = await getAdminOrderById(params.id);
  if (!order) notFound();
  const timeline = await getOrderActivityTimeline(order.id);
  // COD orders never show a refund section at all (Part 8) — Razorpay refund logic is entirely inapplicable, not merely ineligible.
  const refundEligibility = canManageOrders(session.role) && order.paymentMethod === "RAZORPAY" ? await getRefundEligibility(order.id) : null;

  const shippingAddress = order.shippingAddress as unknown as AddressSnapshot;
  const billingAddress = order.billingAddress as unknown as AddressSnapshot;
  const sameAddress = JSON.stringify(order.shippingAddress) === JSON.stringify(order.billingAddress);

  return (
    <div className="space-y-6">
      <AdminBreadcrumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: order.orderNumber }]} />

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

      <section className="border border-ink-100 bg-bone p-5 text-sm">
        <h2 className="mb-2 font-display text-base text-ink">Customer</h2>
        <p className="text-ink-700">
          {order.customerName}
          <br />
          {order.customerEmail}
          <br />
          {order.customerPhone}
        </p>
      </section>

      {order.statusReason && (
        <p className="border border-ink-100 bg-bone-100 px-4 py-2 text-xs text-ink-500">
          {order.status === "CANCELLED" ? "Cancellation" : "Return"} reason: {STATUS_REASON_LABELS[order.statusReason]}
        </p>
      )}

      {canManageOrders(session.role) && (
        <p className="border border-ink-100 bg-bone-100 px-4 py-2 text-xs text-ink-500">
          Shipping provider: {process.env.SHIPPING_PROVIDER === "shiprocket" ? "Shiprocket" : "Mock (local testing only — no real courier is contacted)"}
        </p>
      )}

      {canManageOrders(session.role) ? (
        <StatusUpdateForm
          orderId={order.id}
          currentStatus={order.status}
          paymentMethod={order.paymentMethod}
          allowedNextStatuses={ORDER_STATUS_TRANSITIONS[order.status]}
          currentTrackingNumber={order.trackingNumber}
          currentCourierName={order.courierName}
        />
      ) : (
        (order.trackingNumber || order.courierName) && (
          <section className="border border-ink-100 bg-bone-100 p-4">
            <h3 className="mb-1 text-xs uppercase tracking-wide text-ink-500">Tracking</h3>
            <p className="text-sm text-ink-700">
              {order.courierName ?? "Courier"}
              {order.trackingNumber && ` · ${order.trackingNumber}`}
            </p>
          </section>
        )
      )}

      <AdminOrderTimeline placedAt={order.createdAt} events={timeline} />

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
          {order.payment && <> · {formatPrice(order.payment.amount.toString())}</>}
        </p>
        {order.payment?.refundStatus && (
          <div className="mt-3 space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-500">
            <p>Refund status: {order.payment.refundStatus}</p>
            {order.payment.refundedAmount && <p>Refunded amount: {formatPrice(order.payment.refundedAmount.toString())}</p>}
            {order.payment.razorpayRefundId && <p>Razorpay refund ID: {order.payment.razorpayRefundId}</p>}
            {order.payment.refundInitiatedAt && (
              <p>Initiated: {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(order.payment.refundInitiatedAt)}</p>
            )}
            {order.payment.refundedAt && (
              <p>Completed: {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(order.payment.refundedAt)}</p>
            )}
          </div>
        )}
      </section>

      {refundEligibility && (
        <RefundPanel
          orderId={order.id}
          eligible={refundEligibility.eligible}
          ineligibleReason={refundEligibility.eligible ? undefined : refundEligibility.reason}
          maxRefundableAmount={refundEligibility.maxRefundableAmount}
        />
      )}
    </div>
  );
}
