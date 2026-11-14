"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface RowResult {
  rowNumber: number;
  slug: string;
  ok: boolean;
  errors: string[];
  changed: boolean;
}

interface ParseResponse {
  rawRows: Record<string, string>[];
  results: RowResult[];
  summary: { update: number; unchanged: number; error: number };
}

interface ApplyResponse {
  updated: number;
  unchanged: number;
  failed: number;
  errors: { rowNumber: number; slug: string; errors: string[] }[];
}

/** Same upload -> preview -> confirm shape as ImportWizard.tsx (products)
 *  and InventoryImportWizard.tsx — deliberately kept as its own small
 *  component rather than a shared generic one, since the preview columns
 *  and API routes differ per entity, matching this project's existing
 *  precedent of one wizard component per import type. */
export default function CategorySeoImportWizard() {
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
      const res = await fetch("/api/admin/categories/import/parse", { method: "POST", body: form });
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
      const res = await fetch("/api/admin/categories/import/apply", {
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
    <div className="max-w-2xl border border-ink-100 bg-bone p-6">
      {error && <p className="mb-4 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      {step === "upload" && (
        <div>
          <p className="mb-3 text-sm text-ink-700">
            Columns: <strong>Slug</strong>, <strong>SEO Title</strong>, <strong>SEO Description</strong>. Only these two
            SEO fields can be changed this way — everything else about a category (name, image, visibility) is managed
            elsewhere.
          </p>
          <p className="mb-3 text-xs text-ink-500">
            Leave a cell blank to leave that field unchanged. Put a single hyphen &quot;-&quot; in a cell to clear an
            existing value. Nothing is applied until you confirm on the next screen.
          </p>
          <label className="mb-1 block text-xs text-ink-500">Category SEO file (.csv or .xlsx)</label>
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
          <h2 className="font-display text-lg text-ink">Category SEO Import Preview</h2>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">To update</dt>
              <dd className="font-medium text-ink">{parseData.summary.update}</dd>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Unchanged</dt>
              <dd className="font-medium text-ink">{parseData.summary.unchanged}</dd>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Errors</dt>
              <dd className="font-medium text-clay">{parseData.summary.error}</dd>
            </div>
          </dl>

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
                          <strong>Row {r.rowNumber} (Slug {r.slug || "—"}):</strong> {r.errors.join("; ")}
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
            <Button type="button" variant="primary" size="sm" disabled={busy || parseData.summary.update === 0} onClick={confirmImport}>
              {busy ? "Importing…" : "Confirm Import"}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && applyResult && (
        <div className="space-y-4">
          <h2 className="font-display text-lg text-ink">Import Summary</h2>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Updated</dt>
              <dd className="font-medium text-green-700">{applyResult.updated}</dd>
            </div>
            <div className="flex justify-between border-b border-ink-100 pb-2">
              <dt className="text-ink-500">Unchanged</dt>
              <dd className="font-medium text-ink">{applyResult.unchanged}</dd>
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
                    <strong>Row {r.rowNumber} (Slug {r.slug || "—"}):</strong> {r.errors.join("; ")}
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
