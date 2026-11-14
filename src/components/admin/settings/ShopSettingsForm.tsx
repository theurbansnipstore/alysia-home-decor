"use client";

import { useState, type FormEvent } from "react";
import type { ShopSettings } from "@/lib/settings/shop";
import Button from "@/components/ui/Button";

const TOGGLES: { key: keyof ShopSettings; label: string }[] = [
  { key: "showFilters", label: "Show filter sidebar" },
  { key: "showCategoryFilter", label: "Show category filter" },
  { key: "showThemeFilter", label: "Show theme filter" },
  { key: "showPriceFilter", label: "Show price filter" },
  { key: "showSort", label: "Show sort dropdown" },
  { key: "showWishlistOnCards", label: "Show Wishlist button on product cards" },
  { key: "showAddToCartOnCards", label: "Show Add to Cart button on product cards" },
  { key: "showRatingOnCards", label: "Show star rating on product cards (Shop/Categories/Themes)" },
];

export default function ShopSettingsForm({ initial }: { initial: ShopSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/shop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save shop settings.");
        return;
      }
      setMessage("Shop settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-ink-100 bg-bone p-6">
      {TOGGLES.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={values[key] as boolean}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
            className="h-4 w-4 border-ink-100"
          />
          {label}
        </label>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Products Per Page</label>
          <select
            value={values.productsPerPage}
            onChange={(e) => setValues((v) => ({ ...v, productsPerPage: Number(e.target.value) as 12 | 24 | 48 }))}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          >
            {[12, 24, 48].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Grid Columns (desktop)</label>
          <select
            value={values.gridColumns}
            onChange={(e) => setValues((v) => ({ ...v, gridColumns: Number(e.target.value) as 3 | 4 }))}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          >
            {[3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
