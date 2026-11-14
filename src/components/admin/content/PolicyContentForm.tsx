"use client";

import { useState, type FormEvent } from "react";
import type { PolicySectionSetting } from "@/lib/settings/shipping";
import Button from "@/components/ui/Button";

interface PolicyContent {
  title: string;
  sections: PolicySectionSetting[];
}

interface FreeShippingFields {
  enabled: boolean;
  threshold: number;
}

function newSection(sortOrder: number): PolicySectionSetting {
  return { id: `section-${Date.now()}`, heading: "", body: "", enabled: true, sortOrder };
}

/**
 * Module 37: `freeShipping` is optional and only passed by the Shipping
 * Policy admin page (src/app/admin/content/shipping/page.tsx) — when
 * present, its two fields are rendered and included in the submitted body;
 * the Returns Policy page (the only other caller) passes nothing, so its
 * submission shape is completely unchanged and returnsSettingsSchema never
 * needs to know these fields exist.
 */
export default function PolicyContentForm({
  initial,
  apiPath,
  freeShipping,
}: {
  initial: PolicyContent;
  apiPath: string;
  freeShipping?: FreeShippingFields;
}) {
  const [title, setTitle] = useState(initial.title);
  const [sections, setSections] = useState<PolicySectionSetting[]>(initial.sections);
  const [shippingEnabled, setShippingEnabled] = useState(freeShipping?.enabled ?? true);
  const [shippingThreshold, setShippingThreshold] = useState(freeShipping ? String(freeShipping.threshold) : "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<PolicySectionSetting>) {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (freeShipping) {
      const parsed = Number(shippingThreshold);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Enter a valid, non-negative free-shipping threshold.");
        return;
      }
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sections: sections.map((s, i) => ({ ...s, sortOrder: i })),
          ...(freeShipping ? { freeShippingEnabled: shippingEnabled, freeShippingThreshold: Number(shippingThreshold) } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save content.");
        return;
      }
      setMessage("Saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <div>
        <label className="mb-1 block text-xs text-ink-500">Page Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full max-w-md border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      {freeShipping && (
        <div className="max-w-md space-y-3 border border-ink-100 bg-bone p-4">
          <p className="font-display text-sm text-ink">Free Shipping Threshold</p>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={shippingEnabled} onChange={(e) => setShippingEnabled(e.target.checked)} className="h-4 w-4" />
            Waive shipping above a subtotal amount
          </label>
          {shippingEnabled && (
            <div>
              <label className="mb-1 block text-xs text-ink-500">Free shipping above (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={shippingThreshold}
                onChange={(e) => setShippingThreshold(e.target.value)}
                className="w-40 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
              />
              <p className="mt-1 text-xs text-ink-300">Orders at or above this amount ship free. Below it, the standard shipping charge applies.</p>
            </div>
          )}
        </div>
      )}

      {sections.map((section, index) => (
        <div key={section.id} className="border border-ink-100 bg-bone p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-ink-500">
              <input type="checkbox" checked={section.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
              Enabled
            </label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => remove(index)} className="text-clay hover:underline">
                Remove
              </button>
            </div>
          </div>
          <input
            type="text"
            required
            placeholder="Section heading"
            value={section.heading}
            onChange={(e) => update(index, { heading: e.target.value })}
            className="mb-2 w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <textarea
            required
            rows={3}
            placeholder="Section content"
            value={section.body}
            onChange={(e) => update(index, { body: e.target.value })}
            className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => setSections((prev) => [...prev, newSection(prev.length)])}
        className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
      >
        + Add Section
      </button>

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
