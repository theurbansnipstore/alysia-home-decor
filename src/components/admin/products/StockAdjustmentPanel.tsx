"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface MovementRow {
  id: string;
  change: number;
  reason: string;
  note: string | null;
  adjustedByName?: string | null;
  previousStock?: number;
  newStock?: number;
  createdAt: string | Date;
}

const REASONS: { value: string; label: string }[] = [
  { value: "purchase", label: "Purchase" },
  { value: "restock", label: "Restock" },
  { value: "damage", label: "Damaged" },
  { value: "lost", label: "Lost" },
  { value: "correction", label: "Correction" },
  { value: "return", label: "Return" },
  { value: "other", label: "Other" },
];

const REASON_LABELS = new Map(REASONS.map((r) => [r.value, r.label]));

/** Mirrors getMovementSource() in stock-service.ts (server-only, can't be
 *  imported into this client component) — the 3 raw reason strings the
 *  order/payment flow writes directly; everything else is a manual
 *  adjustment. Lets an automated order/cancellation/return movement read
 *  clearly as such instead of looking like an unattributed manual edit. */
const AUTOMATED_SOURCE_LABELS: Record<string, string> = { order: "Order", cancelled: "Cancellation", returned: "Return" };
function getSourceLabel(reason: string): string {
  return AUTOMATED_SOURCE_LABELS[reason] ?? "Admin";
}

export default function StockAdjustmentPanel({
  productId,
  productName,
  sku,
  initialStock,
  lowStockAt,
  initialHistory,
}: {
  productId: string;
  productName: string;
  sku: string;
  initialStock: number;
  lowStockAt: number;
  initialHistory: MovementRow[];
}) {
  const router = useRouter();
  const [stock, setStock] = useState(initialStock);
  const [history, setHistory] = useState<MovementRow[]>(initialHistory);
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("purchase");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const delta = parseInt(change, 10);
    if (!delta) {
      setError("Enter a non-zero adjustment (positive to add, negative to remove).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change: delta, reason, note: note.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't adjust stock.");
        return;
      }
      const newStock = json.data.stockAvailable;
      setHistory((prev) => [{ ...json.data.movement, previousStock: stock, newStock }, ...prev]);
      setStock(newStock);
      setChange("");
      setNote("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-1 font-display text-base text-ink">Stock — {productName}</h2>
      <p className="mb-3 text-xs text-ink-500">SKU: {sku}</p>

      <p className="mb-4 text-2xl text-ink">
        {stock} <span className="text-sm text-ink-500">in stock</span>
        {stock <= lowStockAt && <span className="ml-2 text-sm text-clay">Low stock (threshold {lowStockAt})</span>}
      </p>

      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Adjustment</label>
          <input
            type="number"
            value={change}
            onChange={(e) => setChange(e.target.value)}
            placeholder="+10 or -3"
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-ink-500">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      </div>
      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : "Apply Adjustment"}
        </Button>
      </div>

      <h3 className="mb-2 mt-6 text-sm text-ink-700">Movement History</h3>
      <div className="overflow-x-auto border border-ink-100">
        <table className="w-full text-sm">
          <thead className="border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Previous</th>
              <th className="px-3 py-2">New</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Adjusted By</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {history.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2 text-ink-500">{new Date(m.createdAt).toLocaleString()}</td>
                <td className={`px-3 py-2 ${m.change < 0 ? "text-clay" : "text-green-700"}`}>
                  {m.change > 0 ? `+${m.change}` : m.change}
                </td>
                <td className="px-3 py-2 text-ink-500">{m.previousStock ?? "—"}</td>
                <td className="px-3 py-2 text-ink-700">{m.newStock ?? "—"}</td>
                <td className="px-3 py-2 text-ink-700">{REASON_LABELS.get(m.reason) ?? m.reason}</td>
                <td className="px-3 py-2 text-ink-500">{getSourceLabel(m.reason)}</td>
                <td className="px-3 py-2 text-ink-500">{m.adjustedByName ?? "—"}</td>
                <td className="px-3 py-2 text-ink-500">{m.note ?? "—"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-ink-500">
                  No stock movements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
