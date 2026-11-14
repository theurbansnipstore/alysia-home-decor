"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface RowResult {
  rowNumber: number;
  sku: string;
  quantity: number | null;
  reason: string;
  note: string | null;
  errors: string[];
  ok: boolean;
  productName?: string;
  currentStock?: number;
  projectedStock?: number;
}

interface ParseResponse {
  rawRows: Record<string, string>[];
  results: RowResult[];
  summary: { valid: number; error: number };
}

interface ApplyResponse {
  applied: number;
  failed: number;
  errors: { rowNumber: number; sku: string; errors: string[] }[];
}

export default function InventoryImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseData, setParseData] = useState<ParseResponse | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/inventory/import/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't parse this file.");
        return;
      }
      setParseData(json.data as ParseResponse);
      setStep("preview");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmImport() {
    if (!parseData) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawRows: parseData.rawRows }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't apply this import.");
        return;
      }
      setApplyResult(json.data as ApplyResponse);
      setStep("done");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setParseData(null);
    setApplyResult(null);
    setShowErrors(false);
    setStep("upload");
  }

  return (
    <div className="max-w-3xl border border-ink-100 bg-bone p-6">
      {error && <p className="mb-4 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      {step === "upload" && (
        <div>
          <p className="mb-3 text-sm text-ink-700">
            Columns: <strong>SKU</strong>, <strong>Quantity</strong> (e.g. <code>+20</code> or <code>-3</code>),{" "}
            <strong>Reason</strong> (purchase / restock / damage / lost / correction / return / other),{" "}
            <strong>Notes</strong> (optional).
          </p>
          <p className="mb-3 text-xs text-ink-500">
            Every row becomes its own stock adjustment through the same audit-tracked path as the per-product Stock panel —
            nothing here overwrites a stock number directly. Nothing is applied until you confirm on the next screen.
          </p>
          <label className="mb-1 block text-xs text-ink-500">Inventory adjustment file (.csv or .xlsx)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-bone-100"
          />
          {busy && <p className="mt-2 text-xs text-ink-500">Parsing and validating…</p>}
        </div>
      )}

      {step === "preview" && parseData && (
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink">Inventory Import Preview</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Valid adjustments</dt>
              <dd className="font-medium text-ink">{parseData.summary.valid}</dd>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Errors</dt>
              <dd className="font-medium text-clay">{parseData.summary.error}</dd>
            </div>
          </dl>

          <div className="max-h-64 overflow-y-auto border border-ink-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-ink-100 bg-bone-200 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Current → New</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {parseData.results.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-3 py-2 text-ink-500">{r.rowNumber}</td>
                    <td className="px-3 py-2 text-ink-700">{r.sku || "—"}</td>
                    <td className="px-3 py-2 text-ink-500">{r.productName ?? "—"}</td>
                    <td className={`px-3 py-2 ${r.quantity !== null && r.quantity < 0 ? "text-clay" : "text-green-700"}`}>
                      {r.quantity !== null ? (r.quantity > 0 ? `+${r.quantity}` : r.quantity) : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-500">
                      {r.currentStock !== undefined && r.projectedStock !== undefined ? `${r.currentStock} → ${r.projectedStock}` : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-700">{r.reason || "—"}</td>
                    <td className="px-3 py-2">
                      {r.ok ? (
                        <span className="text-green-700">OK</span>
                      ) : (
                        <span className="text-clay" title={r.errors.join("; ")}>
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parseData.summary.error > 0 && (
            <div>
              <button type="button" className="text-sm text-brass-600 hover:underline" onClick={() => setShowErrors((v) => !v)}>
                {showErrors ? "Hide Errors" : "View Errors"}
              </button>
              {showErrors && (
                <div className="mt-2 border border-clay/30 bg-clay/5 p-3">
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-ink-700">
                    {parseData.results
                      .filter((r) => !r.ok)
                      .map((r) => (
                        <li key={r.rowNumber}>
                          <strong>Row {r.rowNumber} (SKU {r.sku || "—"}):</strong> {r.errors.join("; ")}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={reset}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" disabled={busy || parseData.summary.valid === 0} onClick={confirmImport}>
              {busy ? "Applying…" : `Confirm ${parseData.summary.valid} Adjustment${parseData.summary.valid === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && applyResult && (
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink">Inventory Import Summary</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Applied</dt>
              <dd className="font-medium text-green-700">{applyResult.applied}</dd>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Failed</dt>
              <dd className="font-medium text-clay">{applyResult.failed}</dd>
            </div>
          </dl>
          {applyResult.failed > 0 && (
            <div className="border border-clay/30 bg-clay/5 p-3">
              <p className="mb-2 text-xs uppercase tracking-wide text-clay">Failures</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-ink-700">
                {applyResult.errors.map((r) => (
                  <li key={r.rowNumber}>
                    <strong>Row {r.rowNumber} (SKU {r.sku || "—"}):</strong> {r.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={reset}>
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
