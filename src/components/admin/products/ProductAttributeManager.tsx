"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface AttributeRow {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  isVisible: boolean;
}

export default function ProductAttributeManager({ productId, initial }: { productId: string; initial: AttributeRow[] }) {
  const router = useRouter();
  const [attributes, setAttributes] = useState<AttributeRow[]>([...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addAttribute() {
    if (!label.trim() || !value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/attributes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), value: value.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't add attribute.");
        return;
      }
      setAttributes((prev) => [...prev, json.data]);
      setLabel("");
      setValue("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function updateAttribute(id: string, patch: Partial<AttributeRow>) {
    setAttributes((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await fetch(`/api/admin/products/${productId}/attributes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function removeAttribute(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/attributes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't remove attribute.");
        return;
      }
      setAttributes((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = attributes.findIndex((a) => a.id === id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= attributes.length) return;

    const next = [...attributes];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    const reordered = next.map((a, i) => ({ ...a, sortOrder: i }));
    setAttributes(reordered);

    setBusy(true);
    try {
      await fetch(`/api/admin/products/${productId}/attributes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((a) => ({ id: a.id, sortOrder: a.sortOrder })) }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-1 font-display text-base text-ink">Product Details / Attributes</h2>
      <p className="mb-3 text-xs text-ink-500">Shown on the storefront as "Specifications". Hidden attributes stay admin-only.</p>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      <div className="space-y-2">
        {attributes.map((a, i) => (
          <div key={a.id} className="grid grid-cols-1 items-center gap-2 border border-ink-100 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
            <input
              defaultValue={a.label}
              onBlur={(e) => updateAttribute(a.id, { label: e.target.value })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <input
              defaultValue={a.value}
              onBlur={(e) => updateAttribute(a.id, { value: e.target.value })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <label className="flex items-center gap-1 text-xs text-ink-700">
              <input type="checkbox" checked={a.isVisible} onChange={(e) => updateAttribute(a.id, { isVisible: e.target.checked })} />
              Visible
            </label>
            <div className="flex gap-1">
              <button type="button" disabled={busy || i === 0} onClick={() => move(a.id, -1)} className="text-xs text-ink-700 disabled:text-ink-200">
                ↑
              </button>
              <button type="button" disabled={busy || i === attributes.length - 1} onClick={() => move(a.id, 1)} className="text-xs text-ink-700 disabled:text-ink-200">
                ↓
              </button>
            </div>
            <button type="button" disabled={busy} onClick={() => removeAttribute(a.id)} className="text-xs text-clay hover:underline">
              Remove
            </button>
          </div>
        ))}
        {attributes.length === 0 && <p className="text-sm text-ink-500">No attributes yet.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-100 pt-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-500">Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Material" className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-500">Value</label>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Solid Sheesham Wood" className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={addAttribute}>
          Add Attribute
        </Button>
      </div>
    </section>
  );
}
