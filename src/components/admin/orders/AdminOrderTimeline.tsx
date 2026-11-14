import type { OrderTimelineEvent } from "@/lib/orders/order-timeline";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  READY_TO_SHIP: "Ready to Ship",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

const REASON_LABELS: Record<string, string> = {
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

function TypeTag({ type }: { type: "placed" | "status" | "shipment" }) {
  const label = type === "placed" ? "Order" : type === "status" ? "Order Activity" : "Shipment Activity";
  const cls = type === "shipment" ? "bg-brass/10 text-brass-600" : "bg-ink-100 text-ink-700";
  return <span className={`px-1.5 py-0.5 text-[10px] uppercase tracking-wide whitespace-nowrap ${cls}`}>{label}</span>;
}

/**
 * Reads directly from ActivityLog (via getOrderActivityTimeline) — no
 * separate timeline table. Distinguishes Order Activity (status changes)
 * from Shipment Activity (courier/tracking-only changes), per Module 24
 * Part 12. Inventory movements are deliberately not interleaved here:
 * StockMovement has no orderId column (only a free-text note), so joining
 * it in would mean fragile substring matching — flagged as a limitation in
 * the module report rather than guessed at.
 */
export default function AdminOrderTimeline({ placedAt, events }: { placedAt: Date; events: OrderTimelineEvent[] }) {
  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Order Timeline</h2>
      <ol className="space-y-3 text-sm">
        <li className="flex flex-wrap items-center gap-2">
          <TypeTag type="placed" />
          <span className="text-ink-700">Order placed</span>
          <span className="text-xs text-ink-400">{placedAt.toLocaleString()}</span>
        </li>
        {events.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-2">
            <TypeTag type={e.type} />
            {e.type === "status" ? (
              <span className="text-ink-700">
                {STATUS_LABELS[e.previousStatus ?? ""] ?? e.previousStatus} → {STATUS_LABELS[e.newStatus ?? ""] ?? e.newStatus}
                {e.statusReason && <span className="text-ink-500"> · {REASON_LABELS[e.statusReason] ?? e.statusReason}</span>}
              </span>
            ) : (
              <span className="text-ink-700">
                Shipment updated
                {e.newCourierName !== undefined && <span> · Courier: {e.previousCourierName ?? "—"} → {e.newCourierName ?? "—"}</span>}
                {e.newTrackingNumber !== undefined && <span> · Tracking: {e.previousTrackingNumber ?? "—"} → {e.newTrackingNumber ?? "—"}</span>}
              </span>
            )}
            <span className="text-xs text-ink-400">
              {e.createdAt.toLocaleString()} · {e.actorName}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
