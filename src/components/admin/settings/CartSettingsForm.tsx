"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { CartContentSettings } from "@/lib/settings/cart";
import Button from "@/components/ui/Button";

export default function CartSettingsForm({ initial }: { initial: CartContentSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof CartContentSettings>(key: K) {
    return {
      value: values[key] as string,
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save cart settings.");
        return;
      }
      setMessage("Cart settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-ink-100 bg-bone p-6">
      <div>
        <label className="mb-1 block text-xs text-ink-500">Cart Page Heading</label>
        <input type="text" required {...field("heading")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Empty Cart Title</label>
        <input type="text" required {...field("emptyTitle")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Empty Cart Description</label>
        <textarea rows={2} {...field("emptyDescription")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Continue Shopping Text</label>
        <input type="text" required {...field("continueShoppingText")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={values.showCoupon} onChange={(e) => setValues((v) => ({ ...v, showCoupon: e.target.checked }))} className="h-4 w-4 border-ink-100" />
        Show coupon field
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={values.showRecommendations} onChange={(e) => setValues((v) => ({ ...v, showRecommendations: e.target.checked }))} className="h-4 w-4 border-ink-100" />
        Show &quot;You May Also Like&quot; recommendations
      </label>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
