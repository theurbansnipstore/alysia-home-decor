"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import type { OrderStatus, PaymentMethod, OrderReturnReason } from "@prisma/client";
import { CANCELLATION_REASON_VALUES, RETURN_REASON_VALUES } from "@/lib/validations/order";

const STATUS_LABELS: Record<OrderStatus, string> = {
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

/** Module 25 Part 2 — CANCELLED and RETURNED each offer only their own semantically-correct reason subset (status-service.ts is the actual enforcement point; this must stay in sync with it). */
const REASON_LABELS: Record<OrderReturnReason, string> = {
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

interface StatusUpdateFormProps {
  orderId: string;
  currentStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  /** Computed server-side from status-service.ts's ORDER_STATUS_TRANSITIONS — this component never decides what's legal. */
  allowedNextStatuses: OrderStatus[];
  currentTrackingNumber: string | null;
  currentCourierName: string | null;
}

export default function StatusUpdateForm({
  orderId,
  currentStatus,
  paymentMethod,
  allowedNextStatuses,
  currentTrackingNumber,
  currentCourierName,
}: StatusUpdateFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(currentTrackingNumber ?? "");
  const [courierName, setCourierName] = useState(currentCourierName ?? "");
  const [statusReason, setStatusReason] = useState<OrderReturnReason | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const options = [currentStatus, ...allowedNextStatuses];
  const needsReason = status !== currentStatus && (status === "CANCELLED" || status === "RETURNED");
  // Mirrors status-service.ts's exact scoping rule — only offered client-side when it could actually be accepted.
  const canRefuseCod = status === "RETURNED" && currentStatus === "OUT_FOR_DELIVERY" && paymentMethod === "COD";
  // Mirrors status-service.ts's reason-taxonomy split (Module 25 Part 2):
  // CANCELLED only ever happens pre-shipment, RETURNED only ever happens
  // post-shipment — each gets its own semantically-correct reason subset,
  // never the other's.
  const reasonOptions =
    status === "CANCELLED"
      ? ([...CANCELLATION_REASON_VALUES] as OrderReturnReason[])
      : ([...RETURN_REASON_VALUES] as OrderReturnReason[]).filter((r) => r !== "CUSTOMER_REFUSED_COD" || canRefuseCod);

  async function submit() {
    if (needsReason && !statusReason) {
      setError("Please select a reason before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber.trim() || null,
          courierName: courierName.trim() || null,
          statusReason: needsReason ? statusReason : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't update this order.");
        return;
      }
      setSuccess(json.data.alreadyInStatus ? "No status change — tracking info saved." : "Order updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Update Order</h2>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}
      {success && <p className="mb-3 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus);
              setStatusReason("");
            }}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          >
            {options.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
                {s === currentStatus ? " (current)" : ""}
              </option>
            ))}
          </select>
        </div>
        {needsReason && (
          <div>
            <label className="mb-1 block text-xs text-ink-500">Reason (required)</label>
            <select
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value as OrderReturnReason)}
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            >
              <option value="">Select a reason…</option>
              {reasonOptions.map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-ink-500">Courier Name</label>
          <input
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Tracking Number</label>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      {allowedNextStatuses.length === 0 && (
        <p className="mt-2 text-xs text-ink-500">This order is in a final state — only tracking details can still be edited.</p>
      )}

      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </section>
  );
}
