"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import type { CategoryDTO, ThemeDTO } from "@/types";
import type { BulkSelectionInput, BulkChangesInput } from "@/lib/validations/bulk-product";

interface BulkEditModalProps {
  selection: BulkSelectionInput;
  selectionCount: number;
  categories: CategoryDTO[];
  themes: ThemeDTO[];
  onClose: () => void;
  onApplied: () => void;
}

interface RowError {
  productId: string;
  sku: string;
  error?: string;
}

interface PreviewState {
  totalSelected: number;
  willUpdate: number;
  errors: RowError[];
  globalError?: string;
}

const STATUS_OPTIONS = ["ACTIVE", "DRAFT", "ARCHIVED"];

type FieldKey =
  | "price"
  | "discountPrice"
  | "categoryId"
  | "themeId"
  | "status"
  | "lowStockAt"
  | "isFeatured"
  | "isBestSeller"
  | "isTrending"
  | "isNewArrival"
  | "material"
  | "color";

const FIELD_LABELS: Record<FieldKey, string> = {
  price: "Price",
  discountPrice: "Compare-at price",
  categoryId: "Category",
  themeId: "Theme",
  status: "Status",
  lowStockAt: "Low-stock threshold",
  isFeatured: "Featured",
  isBestSeller: "Best Seller",
  isTrending: "Trending",
  isNewArrival: "New Arrival",
  material: "Material",
  color: "Color",
};

export default function BulkEditModal({ selection, selectionCount, categories, themes, onClose, onApplied }: BulkEditModalProps) {
  const [step, setStep] = useState<"form" | "preview" | "done">("form");
  const [enabled, setEnabled] = useState<Set<FieldKey>>(new Set());
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [applyResult, setApplyResult] = useState<{ applied: number; failed: number; failures: RowError[] } | null>(null);

  function toggleField(key: FieldKey) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function buildChanges(): BulkChangesInput {
    const changes: Record<string, unknown> = {};
    if (enabled.has("price")) changes.price = String(values.price ?? "0");
    if (enabled.has("discountPrice")) {
      const v = values.discountPrice;
      changes.discountPrice = v === "" || v === undefined ? null : String(v);
    }
    if (enabled.has("categoryId")) changes.categoryId = String(values.categoryId ?? "");
    if (enabled.has("themeId")) changes.themeId = values.themeId ? String(values.themeId) : null;
    if (enabled.has("status")) changes.status = String(values.status ?? "ACTIVE");
    if (enabled.has("lowStockAt")) changes.lowStockAt = parseInt(String(values.lowStockAt ?? "5"), 10) || 0;
    if (enabled.has("isFeatured")) changes.isFeatured = !!values.isFeatured;
    if (enabled.has("isBestSeller")) changes.isBestSeller = !!values.isBestSeller;
    if (enabled.has("isTrending")) changes.isTrending = !!values.isTrending;
    if (enabled.has("isNewArrival")) changes.isNewArrival = !!values.isNewArrival;
    if (enabled.has("material")) changes.material = String(values.material ?? "");
    if (enabled.has("color")) changes.color = String(values.color ?? "");
    return changes as BulkChangesInput;
  }

  async function runPreview() {
    setError(null);
    if (enabled.size === 0) {
      setError("Choose at least one field to change.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection, changes: buildChanges() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't preview this change.");
        return;
      }
      const data = json.data as {
        totalSelected: number;
        rows: { productId: string; sku: string; ok: boolean; error?: string }[];
        globalError?: string;
      };
      const rows = data.rows || [];
      setPreview({
        totalSelected: data.totalSelected,
        willUpdate: rows.filter((r) => r.ok).length,
        errors: rows.filter((r) => !r.ok).map((r) => ({ productId: r.productId, sku: r.sku, error: r.error })),
        globalError: data.globalError,
      });
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }

  async function applyChanges() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products/bulk/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection, changes: buildChanges() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't apply this change.");
        return;
      }
      setApplyResult(json.data);
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  function downloadErrorReport(rows: RowError[]) {
    const header = "productId,sku,error\n";
    const body = rows
      .map((r) => [r.productId, r.sku, (r.error ?? "").replace(/"/g, '""')].map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-edit-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-ink-100 bg-bone p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Bulk Edit — {selectionCount} product{selectionCount === 1 ? "" : "s"}</h2>
          <button type="button" onClick={onClose} className="text-ink-500 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {error && <p className="mb-4 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

        {step === "form" && (
          <div className="space-y-4">
            <FieldRow keyName="price" label="Price (₹)" enabled={enabled} toggle={toggleField}>
              <input type="number" min="0" step="0.01" value={String(values.price ?? "")} onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))} className={inputCls} />
            </FieldRow>
            <FieldRow keyName="discountPrice" label="Compare-at price (₹, blank to clear)" enabled={enabled} toggle={toggleField}>
              <input type="number" min="0" step="0.01" value={String(values.discountPrice ?? "")} onChange={(e) => setValues((v) => ({ ...v, discountPrice: e.target.value }))} className={inputCls} />
            </FieldRow>
            <FieldRow keyName="categoryId" label="Category" enabled={enabled} toggle={toggleField}>
              <select value={String(values.categoryId ?? "")} onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))} className={inputCls}>
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow keyName="themeId" label="Theme (blank to clear)" enabled={enabled} toggle={toggleField}>
              <select value={String(values.themeId ?? "")} onChange={(e) => setValues((v) => ({ ...v, themeId: e.target.value }))} className={inputCls}>
                <option value="">None</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow keyName="status" label="Status" enabled={enabled} toggle={toggleField}>
              <select value={String(values.status ?? "ACTIVE")} onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))} className={inputCls}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow keyName="lowStockAt" label="Low-stock threshold" enabled={enabled} toggle={toggleField}>
              <input type="number" min="0" value={String(values.lowStockAt ?? "")} onChange={(e) => setValues((v) => ({ ...v, lowStockAt: e.target.value }))} className={inputCls} />
            </FieldRow>
            <FieldRow keyName="material" label="Material" enabled={enabled} toggle={toggleField}>
              <input value={String(values.material ?? "")} onChange={(e) => setValues((v) => ({ ...v, material: e.target.value }))} className={inputCls} />
            </FieldRow>
            <FieldRow keyName="color" label="Color" enabled={enabled} toggle={toggleField}>
              <input value={String(values.color ?? "")} onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))} className={inputCls} />
            </FieldRow>

            <div className="border-t border-ink-100 pt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-ink-500">Merchandising flags</p>
              <div className="flex flex-wrap gap-4">
                {(["isNewArrival", "isBestSeller", "isTrending", "isFeatured"] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={enabled.has(key)} onChange={() => toggleField(key)} />
                    {FIELD_LABELS[key]}
                    {enabled.has(key) && (
                      <select
                        value={values[key] ? "on" : "off"}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value === "on" }))}
                        className="ml-1 border border-ink-100 bg-bone px-1 py-0.5 text-xs"
                      >
                        <option value="on">ON</option>
                        <option value="off">OFF</option>
                      </select>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" disabled={busy} onClick={runPreview}>
                {busy ? "Checking…" : "Preview Changes"}
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-4">
            {preview.globalError ? (
              <p className="border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{preview.globalError}</p>
            ) : (
              <>
                <p className="text-sm text-ink-700">
                  <strong>{preview.willUpdate}</strong> product{preview.willUpdate === 1 ? "" : "s"} can be updated
                  {preview.errors.length > 0 && (
                    <>
                      {" "}
                      · <strong className="text-clay">{preview.errors.length}</strong> have errors
                    </>
                  )}
                </p>
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-ink-500">Changes</p>
                  <ul className="list-inside list-disc text-sm text-ink-700">
                    {Array.from(enabled).map((key) => (
                      <li key={key}>{FIELD_LABELS[key]}</li>
                    ))}
                  </ul>
                </div>
                {preview.errors.length > 0 && (
                  <div className="border border-clay/30 bg-clay/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-clay">Errors</p>
                      <button type="button" className="text-xs text-brass-600 hover:underline" onClick={() => downloadErrorReport(preview.errors)}>
                        Download Error Report
                      </button>
                    </div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-ink-700">
                      {preview.errors.map((e) => (
                        <li key={e.productId}>
                          <strong>SKU {e.sku}:</strong> {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setStep("form")}>
                Back
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {!preview.globalError && preview.willUpdate > 0 && (
                <Button type="button" variant="primary" size="sm" disabled={busy} onClick={applyChanges}>
                  {busy ? "Applying…" : `Apply Changes (${preview.willUpdate})`}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === "done" && applyResult && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              <strong className="text-green-700">{applyResult.applied}</strong> updated
              {applyResult.failed > 0 && (
                <>
                  {" "}
                  · <strong className="text-clay">{applyResult.failed}</strong> failed
                </>
              )}
            </p>
            {applyResult.failed > 0 && (
              <div className="border border-clay/30 bg-clay/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wide text-clay">Failures</p>
                  <button type="button" className="text-xs text-brass-600 hover:underline" onClick={() => downloadErrorReport(applyResult.failures)}>
                    Download Error Report
                  </button>
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-ink-700">
                  {applyResult.failures.map((e) => (
                    <li key={e.productId}>
                      <strong>SKU {e.sku}:</strong> {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end border-t border-ink-100 pt-4">
              <Button type="button" variant="primary" size="sm" onClick={onApplied}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none";

function FieldRow({
  keyName,
  label,
  enabled,
  toggle,
  children,
}: {
  keyName: FieldKey;
  label: string;
  enabled: Set<FieldKey>;
  toggle: (key: FieldKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input type="checkbox" className="mt-2.5" checked={enabled.has(keyName)} onChange={() => toggle(keyName)} />
      <div className="flex-1">
        <label className="mb-1 block text-xs text-ink-500">{label}</label>
        <div className={enabled.has(keyName) ? "" : "pointer-events-none opacity-40"}>{children}</div>
      </div>
    </div>
  );
}
