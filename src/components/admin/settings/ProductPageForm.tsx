"use client";

import { useState, type FormEvent } from "react";
import type { ProductPageSettings, ProductPolicySetting, ProductBadgeSetting } from "@/lib/settings/product-page";
import Button from "@/components/ui/Button";
import MediaPickerField from "@/components/admin/content/MediaPickerField";

type BooleanFieldKey = "showRatingReviews" | "showBuyItNow" | "showWishlist" | "showSpecifications" | "showRelatedProducts" | "showPolicyInfo";

const FIELDS: { key: BooleanFieldKey; label: string }[] = [
  { key: "showRatingReviews", label: "Show rating & review summary near the title" },
  { key: "showBuyItNow", label: "Show Buy It Now" },
  { key: "showWishlist", label: "Show Wishlist button" },
  { key: "showSpecifications", label: "Show Specifications table" },
  { key: "showRelatedProducts", label: "Show related product rails" },
  { key: "showPolicyInfo", label: "Show delivery/returns/care policy accordion (master switch — the individual sections below only matter while this stays on)" },
];

export default function ProductPageForm({ initial }: { initial: ProductPageSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePolicy(index: number, patch: Partial<ProductPolicySetting>) {
    setValues((v) => ({ ...v, policies: v.policies.map((p, i) => (i === index ? { ...p, ...patch } : p)) }));
  }

  function movePolicy(index: number, direction: -1 | 1) {
    setValues((v) => {
      const next = [...v.policies];
      const target = index + direction;
      if (target < 0 || target >= next.length) return v;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...v, policies: next.map((p, i) => ({ ...p, sortOrder: i })) };
    });
  }

  function updateBadge(index: number, patch: Partial<ProductBadgeSetting>) {
    setValues((v) => ({ ...v, badges: v.badges.map((b, i) => (i === index ? { ...b, ...patch } : b)) }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/product-page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save settings.");
        return;
      }
      setMessage("Product page settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      <div className="space-y-3 border border-ink-100 bg-bone p-6">
        <p className="mb-2 text-xs text-ink-500">
          Presentation only — Add to Cart and required product data always stay available.
        </p>
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.checked }))}
              className="h-4 w-4 border-ink-100"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="space-y-3 border border-ink-100 bg-bone p-6">
        <p className="font-display text-sm text-ink">Policy Accordion Sections</p>
        {values.policies.map((policy, index) => (
          <div key={policy.id} className="border border-ink-100 bg-bone-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-500">
                <input type="checkbox" checked={policy.enabled} onChange={(e) => updatePolicy(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
                Enabled
              </label>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => movePolicy(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => movePolicy(index, 1)} disabled={index === values.policies.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                  ↓
                </button>
              </div>
            </div>
            <input
              type="text"
              value={policy.heading}
              onChange={(e) => updatePolicy(index, { heading: e.target.value })}
              placeholder="Section heading"
              className="mb-2 w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            <textarea
              rows={3}
              value={policy.body}
              onChange={(e) => updatePolicy(index, { body: e.target.value })}
              placeholder="Section content"
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            {policy.id === "returns" && (
              <p className="mt-1 text-xs text-ink-300">A product&apos;s own Return Policy Override (set on the product itself) replaces this text for that product only.</p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 border border-ink-100 bg-bone p-6">
        <p className="font-display text-sm text-ink">Trust Badges (Handcrafted / Artisan Made / Sustainably Sourced)</p>
        {values.badges.map((badge, index) => (
          <div key={badge.id} className="border border-ink-100 bg-bone-100 p-4">
            <label className="mb-3 flex items-center gap-2 text-xs text-ink-500">
              <input type="checkbox" checked={badge.enabled} onChange={(e) => updateBadge(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
              Enabled
            </label>
            <input
              type="text"
              value={badge.title}
              onChange={(e) => updateBadge(index, { title: e.target.value })}
              placeholder="Title"
              className="mb-2 w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            <input
              type="text"
              value={badge.description}
              onChange={(e) => updateBadge(index, { description: e.target.value })}
              placeholder="Description (shown as a tooltip on hover)"
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3 border border-ink-100 bg-bone p-6">
        <p className="font-display text-sm text-ink">Materials &amp; Craftsmanship</p>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={values.craftsmanship.enabled}
            onChange={(e) => setValues((v) => ({ ...v, craftsmanship: { ...v.craftsmanship, enabled: e.target.checked } }))}
            className="h-4 w-4 border-ink-100"
          />
          Show this section on the product page
        </label>
        <MediaPickerField
          label="Image URL"
          value={values.craftsmanship.image}
          onChange={(v) => setValues((s) => ({ ...s, craftsmanship: { ...s.craftsmanship, image: v } }))}
        />
        <div>
          <label className="mb-1 block text-xs text-ink-500">Title</label>
          <input
            type="text"
            value={values.craftsmanship.title}
            onChange={(e) => setValues((v) => ({ ...v, craftsmanship: { ...v.craftsmanship, title: e.target.value } }))}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Body</label>
          <textarea
            rows={3}
            value={values.craftsmanship.body}
            onChange={(e) => setValues((v) => ({ ...v, craftsmanship: { ...v.craftsmanship, body: e.target.value } }))}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <div>
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
