"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface RefundPanelProps {
  orderId: string;
  eligible: boolean;
  ineligibleReason?: string;
  maxRefundableAmount?: number;
}

/**
 * Only rendered by the admin order page when the order is CANCELLED/RETURNED
 * with a captured Razorpay payment (Part 8) — the server computed
 * `eligible` via getRefundEligibility(), the actual authority; this
 * component never re-derives eligibility itself, it only reflects it.
 * `POST /api/admin/orders/[id]/refund` re-validates independently anyway
 * (server is the ultimate authority, per Part 8's explicit instruction).
 */
export default function RefundPanel({ orderId, eligible, ineligibleReason, maxRefundableAmount }: RefundPanelProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(maxRefundableAmount !== undefined ? maxRefundableAmount.toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!eligible) {
    return ineligibleReason ? (
      <section className="border border-ink-100 bg-bone-100 p-4 text-xs text-ink-500">
        <h3 className="mb-1 text-xs uppercase tracking-wide text-ink-500">Refund</h3>
        {ineligibleReason}
      </section>
    ) : null;
  }

  async function submit() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not initiate refund.");
        return;
      }
      setSuccess(
        json.data.refundStatus === "PROCESSED"
          ? "Refund processed."
          : json.data.refundStatus === "PENDING"
            ? "Refund initiated — processing with the bank/card network."
            : "Refund request submitted."
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Refund</h2>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}
      {success && <p className="mb-3 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Refund Amount (₹)</label>
          <input
            type="number"
            min="0.01"
            max={maxRefundableAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          {maxRefundableAmount !== undefined && <p className="mt-1 text-xs text-ink-300">Up to ₹{maxRefundableAmount.toFixed(2)}</p>}
        </div>
      </div>

      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={submit}>
          {busy ? "Processing…" : "Initiate Refund"}
        </Button>
      </div>
    </section>
  );
}
