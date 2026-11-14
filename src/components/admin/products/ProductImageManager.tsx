"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

type ImagePurpose = "PRODUCT" | "LIFESTYLE" | "DETAIL";

interface ImageRow {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  purpose?: ImagePurpose;
}

const PURPOSE_OPTIONS: { value: ImagePurpose; label: string }[] = [
  { value: "PRODUCT", label: "Product (main gallery)" },
  { value: "LIFESTYLE", label: "Lifestyle (“See it styled”)" },
  { value: "DETAIL", label: "Detail / close-up" },
];

export default function ProductImageManager({ productId, initial }: { productId: string; initial: ImageRow[] }) {
  const router = useRouter();
  const [images, setImages] = useState<ImageRow[]>([...initial].sort((a, b) => a.sortOrder - b.sortOrder));
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [uploadPurpose, setUploadPurpose] = useState<ImagePurpose>("PRODUCT");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addImage() {
    if (!newUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), altText: newAlt.trim() || null, purpose: uploadPurpose }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't add image.");
        return;
      }
      setImages((prev) => [...prev, json.data]);
      setNewUrl("");
      setNewAlt("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(fileList).forEach((f) => form.append("files", f));
      form.append("purpose", uploadPurpose);

      const res = await fetch(`/api/admin/products/${productId}/images/upload`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't upload image(s).");
        return;
      }
      setImages((prev) => [...prev, ...json.data]);
      router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function setPurpose(id: string, purpose: ImagePurpose) {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, purpose } : img)));
    await fetch(`/api/admin/products/${productId}/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose }),
    });
    router.refresh();
  }

  async function updateAlt(id: string, altText: string) {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, altText } : img)));
    await fetch(`/api/admin/products/${productId}/images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ altText: altText || null }),
    });
    router.refresh();
  }

  async function removeImage(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/images/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't remove image.");
        return;
      }
      setImages((prev) => prev.filter((img) => img.id !== id));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = images.findIndex((img) => img.id === id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= images.length) return;

    const next = [...images];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    const reordered = next.map((img, i) => ({ ...img, sortOrder: i }));
    setImages(reordered);

    setBusy(true);
    try {
      await fetch(`/api/admin/products/${productId}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((img) => ({ id: img.id, sortOrder: img.sortOrder })) }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-3 font-display text-base text-ink">Images</h2>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}

      <div className="space-y-3">
        {images.map((img, i) => (
          <div key={img.id} className="flex items-center gap-3 border border-ink-100 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.altText ?? ""} className="h-16 w-16 shrink-0 object-cover" />
            <div className="flex-1 space-y-1">
              {i === 0 && (
                <span className="inline-block bg-brass/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-brass-600">
                  Primary
                </span>
              )}
              <p className="truncate text-xs text-ink-500">{img.url}</p>
              <input
                defaultValue={img.altText ?? ""}
                placeholder="Alt text"
                onBlur={(e) => updateAlt(img.id, e.target.value)}
                className="w-full border border-ink-100 bg-bone px-2 py-1 text-sm focus:border-brass focus:outline-none"
              />
              <select
                value={img.purpose ?? "PRODUCT"}
                onChange={(e) => setPurpose(img.id, e.target.value as ImagePurpose)}
                className="border border-ink-100 bg-bone px-2 py-1 text-xs focus:border-brass focus:outline-none"
              >
                {PURPOSE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <button type="button" disabled={busy || i === 0} onClick={() => move(img.id, -1)} className="text-xs text-ink-700 disabled:text-ink-200">
                ↑
              </button>
              <button type="button" disabled={busy || i === images.length - 1} onClick={() => move(img.id, 1)} className="text-xs text-ink-700 disabled:text-ink-200">
                ↓
              </button>
            </div>
            <button type="button" disabled={busy} onClick={() => removeImage(img.id)} className="text-xs text-clay hover:underline">
              Remove
            </button>
          </div>
        ))}
        {images.length === 0 && <p className="text-sm text-ink-500">No images yet.</p>}
      </div>

      <div className="mt-4 border-t border-ink-100 pt-4">
        <label className="mb-1 block text-xs text-ink-500">Purpose for new images</label>
        <select
          value={uploadPurpose}
          onChange={(e) => setUploadPurpose(e.target.value as ImagePurpose)}
          className="mb-3 border border-ink-100 bg-bone px-2 py-1 text-xs focus:border-brass focus:outline-none"
        >
          {PURPOSE_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-ink-500">Upload image files (JPEG/PNG/WebP/GIF, up to 5MB each)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            onChange={(e) => uploadFiles(e.target.files)}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:text-bone-100"
          />
          {uploading && <p className="mt-1 text-xs text-ink-500">Uploading…</p>}
        </div>

        <p className="mb-2 text-xs text-ink-500">Or add an image already hosted elsewhere by URL:</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-ink-500">Image URL</label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-ink-500">Alt text</label>
            <input
              value={newAlt}
              onChange={(e) => setNewAlt(e.target.value)}
              className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={addImage}>
            Add Image
          </Button>
        </div>
      </div>
    </section>
  );
}
