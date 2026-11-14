"use client";

import { useMemo, useState, type FormEvent, type ChangeEvent } from "react";
import type { MediaSettings, MediaItemSetting } from "@/lib/settings/media";
import Button from "@/components/ui/Button";
import { checkImageUrl } from "@/lib/config/image-domains";

/**
 * Module 38 Part 2 rewrite: adds search/filter, a real file-upload option
 * (reusing the project's existing storage provider — src/lib/storage —
 * rather than URL-entry only), copy-URL, and a usage check before delete
 * so removing an image that's referenced elsewhere requires deliberate
 * confirmation instead of silently breaking that reference.
 */
export default function MediaContentForm({ initial }: { initial: MediaSettings }) {
  const [items, setItems] = useState<MediaItemSetting[]>(initial.items);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ item: MediaItemSetting; usages: string[]; checked: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q) || i.altText.toLowerCase().includes(q) || i.url.toLowerCase().includes(q));
  }, [items, search]);

  const urlCheck = checkImageUrl(url);

  async function persist(next: MediaItemSetting[]) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save media library.");
        return;
      }
      setItems(next);
      setMessage("Saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || !label.trim()) return;
    const next = [...items, { id: `media-${Date.now()}`, url: url.trim(), altText: altText.trim(), label: label.trim(), createdAt: new Date().toISOString() }];
    await persist(next);
    setLabel("");
    setUrl("");
    setAltText("");
  }

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/content/media/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Upload failed.");
        return;
      }
      setUrl(json.data.url);
      if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ""));
    } catch {
      setError("Network error during upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function requestRemove(item: MediaItemSetting) {
    setPendingDelete({ item, usages: [], checked: false });
    try {
      const res = await fetch(`/api/admin/content/media/usage?url=${encodeURIComponent(item.url)}`);
      const json = await res.json();
      setPendingDelete({ item, usages: json.success ? json.data.usages : [], checked: true });
    } catch {
      setPendingDelete({ item, usages: [], checked: true });
    }
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    const id = pendingDelete.item.id;
    setPendingDelete(null);
    await persist(items.filter((i) => i.id !== id));
  }

  function copyUrl(item: MediaItemSetting) {
    navigator.clipboard?.writeText(item.url).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((c) => (c === item.id ? null : c)), 1500);
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-xs text-ink-500">
        A named library of images to reuse across CMS image fields elsewhere (Branding logo, Homepage sections, page
        hero images, …) via their &quot;Browse Media&quot; picker. Images can be added by URL/path or uploaded
        directly — uploads use this project&apos;s existing storage provider (local disk by default; Cloudinary if
        configured), the same one product image uploads already use. &quot;Used in&quot; is a best-effort check
        against known CMS image fields by exact URL match — it can&apos;t detect a URL pasted directly into a page&apos;s
        text content.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 border border-ink-100 bg-bone p-4">
        <div>
          <label className="mb-1 block text-xs text-ink-500">Label</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="w-40 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Image URL</label>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="w-64 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
          {!urlCheck.ok && <p className="mt-1 max-w-64 text-xs text-clay">{urlCheck.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-500">Alt Text</label>
          <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)} className="w-40 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block cursor-pointer text-xs text-brass-600 hover:underline">
            {uploading ? "Uploading…" : "Or upload a file"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        <Button type="submit" variant="primary" size="sm" disabled={busy || !url.trim() || !label.trim()}>
          Add
        </Button>
      </form>

      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label, alt text, or URL…"
          className="w-full max-w-sm border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      {items.length === 0 ? (
        <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No saved images yet.</p>
      ) : filtered.length === 0 ? (
        <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No images match &quot;{search}&quot;.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={item.id} className="border border-ink-100 bg-bone p-3">
              <img src={item.url} alt={item.altText} className="mb-2 aspect-square w-full rounded-sm object-cover" />
              <p className="truncate text-xs text-ink" title={item.label}>{item.label}</p>
              {item.altText && <p className="truncate text-[10px] text-ink-300" title={item.altText}>{item.altText}</p>}
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => copyUrl(item)} className="text-ink-500 hover:text-brass-600">
                  {copiedId === item.id ? "Copied!" : "Copy URL"}
                </button>
                <button type="button" onClick={() => requestRemove(item)} disabled={busy} className="text-clay hover:underline disabled:opacity-50">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-sm border border-ink-100 bg-bone-100 p-6 shadow-card">
            <h2 className="mb-2 font-display text-lg text-ink">Remove &quot;{pendingDelete.item.label}&quot;?</h2>
            {!pendingDelete.checked ? (
              <p className="mb-4 text-sm text-ink-500">Checking whether this image is used elsewhere…</p>
            ) : pendingDelete.usages.length > 0 ? (
              <div className="mb-4 border border-clay/40 bg-clay/5 p-3 text-sm text-clay">
                <p className="mb-1 font-medium">This image is currently used in:</p>
                <ul className="list-disc pl-4">
                  {pendingDelete.usages.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
                <p className="mt-2">Removing it from Media won&apos;t change those fields, but you&apos;ll lose the shared reference.</p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-ink-500">Not currently used in any known CMS image field.</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPendingDelete(null)} className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={!pendingDelete.checked || busy}
                className="border border-clay bg-clay px-4 py-2 text-sm text-bone-100 hover:bg-clay/90 disabled:opacity-50"
              >
                Remove anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
