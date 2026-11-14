"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface VariantRow {
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: number;
}

export default function ProductVariantManager({ productId, initial }: { productId: string; initial: VariantRow[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState<VariantRow[]>(initial);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addVariant() {
    if (!name.trim() || !sku.trim() || !price) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), sku: sku.trim(), price, stock: parseInt(stock, 10) || 0 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't add variant.");
        return;
      }
      setVariants((prev) => [...prev, json.data]);
      setName("");
      setSku("");
      setPrice("");
      setStock("0");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function updateVariant(id: string, patch: Partial<VariantRow>) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    await fetch(`/api/admin/products/${productId}/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function removeVariant(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't remove variant.");
        return;
      }
      setVariants((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-1 font-display text-base text-ink">Variants</h2>
      <p className="mb-3 text-xs text-ink-500">
        Catalog data only in this module — variants are not yet purchasable in cart or checkout.
      </p>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      <div className="space-y-2">
        {variants.map((v) => (
          <div key={v.id} className="grid grid-cols-1 items-center gap-2 border border-ink-100 p-3 sm:grid-cols-5">
            <input
              defaultValue={v.name}
              onBlur={(e) => updateVariant(v.id, { name: e.target.value })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <input
              defaultValue={v.sku}
              onBlur={(e) => updateVariant(v.id, { sku: e.target.value })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              defaultValue={v.price}
              onBlur={(e) => updateVariant(v.id, { price: e.target.value })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <input
              type="number"
              min="0"
              defaultValue={v.stock}
              onBlur={(e) => updateVariant(v.id, { stock: parseInt(e.target.value, 10) || 0 })}
              className="border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
            />
            <button type="button" disabled={busy} onClick={() => removeVariant(v.id)} className="text-xs text-clay hover:underline">
              Remove
            </button>
          </div>
        ))}
        {variants.length === 0 && <p className="text-sm text-ink-500">No variants yet.</p>}
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-2 border-t border-ink-100 pt-4 sm:grid-cols-5">
        <Labeled label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none" />
        </Labeled>
        <Labeled label="SKU">
          <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none" />
        </Labeled>
        <Labeled label="Price (₹)">
          <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none" />
        </Labeled>
        <Labeled label="Stock">
          <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none" />
        </Labeled>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={addVariant}>
          Add Variant
        </Button>
      </div>
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-ink-500">{label}</label>
      {children}
    </div>
  );
}
