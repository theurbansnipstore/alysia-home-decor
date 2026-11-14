import type { OrderStatus } from "@prisma/client";

// Mirrors the STATUS_STYLES convention already used by Module 10's
// ProductTable.tsx (bg-*-100/text-*-800 for success, bg-clay/10/text-clay
// for terminal/negative states).
const STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-ink-100 text-ink-700",
  CONFIRMED: "bg-ink-100 text-ink-700",
  PACKED: "bg-brass/10 text-brass-600",
  READY_TO_SHIP: "bg-brass/10 text-brass-600",
  SHIPPED: "bg-brass/10 text-brass-600",
  OUT_FOR_DELIVERY: "bg-brass/10 text-brass-600",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-clay/10 text-clay",
  RETURNED: "bg-clay/10 text-clay",
  REFUNDED: "bg-clay/10 text-clay",
};

const LABELS: Record<OrderStatus, string> = {
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

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`px-2 py-0.5 text-xs whitespace-nowrap ${STYLES[status]}`}>{LABELS[status]}</span>;
}
