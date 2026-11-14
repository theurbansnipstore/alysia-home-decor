import type { PaymentStatus, RefundStatus } from "@prisma/client";

const STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-ink-100 text-ink-700",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-clay/10 text-clay",
  REFUNDED: "bg-clay/10 text-clay",
};

const LABELS: Record<PaymentStatus, string> = {
  PENDING: "Payment Pending",
  PAID: "Paid",
  FAILED: "Payment Failed",
  REFUNDED: "Refunded",
};

/**
 * Module 30 Part 7 finding: `Payment.status` flips to "REFUNDED" the
 * moment an order becomes CANCELLED/RETURNED (existing, unmodified
 * status-service.ts behavior, predating Module 28 — a state label, not a
 * real refund; see that file's own "State record only... no Razorpay
 * refund API call happens here" comment). Before Module 28 added
 * `Payment.refundStatus`, there was no way to tell the two apart, so this
 * badge always said the unqualified word "Refunded" for BOTH cases — which
 * is honest once `refundStatus` is actually "PROCESSED" (money moved) but
 * misleading for every other case (no refund attempted yet, one in
 * progress, or one that failed), since "Refunded" reads as a completed
 * fact to anyone looking at it, admin or customer.
 *
 * `refundStatus` is optional and only changes the label when the
 * underlying status is REFUNDED — every other status/every existing
 * caller that hasn't been updated to pass it keeps behaving exactly as
 * before. This is a label-only change: no styling, logic, schema, or
 * refund behavior was touched.
 */
const REFUND_SUBLABELS: Record<Exclude<RefundStatus, "PROCESSED">, string> = {
  PENDING: "Refund Processing",
  FAILED: "Refund Failed",
};

export default function PaymentStatusBadge({ status, refundStatus }: { status: PaymentStatus; refundStatus?: RefundStatus | null }) {
  const label = status === "REFUNDED" && refundStatus !== "PROCESSED" ? (refundStatus ? REFUND_SUBLABELS[refundStatus] : "Cancelled — Refund Not Yet Initiated") : LABELS[status];
  return <span className={`px-2 py-0.5 text-xs whitespace-nowrap ${STYLES[status]}`}>{label}</span>;
}
