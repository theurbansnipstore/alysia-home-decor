import type { CustomerTimelineMilestone } from "@/lib/orders/order-timeline";

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

/**
 * Status milestones only — no staff actor, no shipment change detail (the
 * order page shows current courier/tracking separately). Derived from the
 * same ActivityLog rows the admin timeline uses, via
 * getCustomerOrderTimeline()'s PII-stripped projection.
 */
export default function OrderTimeline({ placedAt, milestones }: { placedAt: Date; milestones: CustomerTimelineMilestone[] }) {
  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Order Timeline</h2>
      <ol className="space-y-2 text-sm">
        <li className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-ink-700">Order placed</span>
          <span className="text-xs text-ink-400">{placedAt.toLocaleString()}</span>
        </li>
        {milestones.map((m, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-ink-700">{STATUS_LABELS[m.status] ?? m.status}</span>
            <span className="text-xs text-ink-400">{m.reachedAt.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
