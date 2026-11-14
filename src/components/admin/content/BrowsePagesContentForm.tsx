"use client";

import { useState, type FormEvent } from "react";
import type { BrowsePagesSettings, BrowsePageContent } from "@/lib/settings/browse-pages";
import Button from "@/components/ui/Button";
import MediaPickerField from "@/components/admin/content/MediaPickerField";

type BrowsePageKey = keyof Pick<BrowsePagesSettings, "shop" | "categories" | "themes" | "collections">;

const PAGES: { key: BrowsePageKey; label: string; path: string }[] = [
  { key: "shop", label: "Shop Page", path: "/shop" },
  { key: "categories", label: "Categories Page", path: "/categories" },
  { key: "themes", label: "Themes Page", path: "/themes" },
  { key: "collections", label: "Collections Page", path: "/collections" },
];

export default function BrowsePagesContentForm({ initial }: { initial: BrowsePagesSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updatePage(key: BrowsePageKey, patch: Partial<BrowsePageContent>) {
    setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/browse-pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save these pages.");
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
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {PAGES.map(({ key, label, path }) => {
        const page = values[key];
        return (
          <div key={key} className="space-y-3 border border-ink-100 bg-bone p-6">
            <p className="font-display text-sm text-ink">
              {label} <span className="text-xs font-normal text-ink-300">({path})</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-ink-500">Eyebrow</label>
                <input type="text" value={page.eyebrow} onChange={(e) => updatePage(key, { eyebrow: e.target.value })} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">Title</label>
                <input type="text" value={page.title} onChange={(e) => updatePage(key, { title: e.target.value })} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-ink-500">Description (optional)</label>
                <textarea rows={2} value={page.description} onChange={(e) => updatePage(key, { description: e.target.value })} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <MediaPickerField label="Hero Image URL (optional)" value={page.heroImage} onChange={(v) => updatePage(key, { heroImage: v })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">SEO Title (optional)</label>
                <input type="text" value={page.seoTitle} onChange={(e) => updatePage(key, { seoTitle: e.target.value })} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-500">SEO Description (optional)</label>
                <input type="text" value={page.seoDesc} onChange={(e) => updatePage(key, { seoDesc: e.target.value })} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
              </div>
            </div>
          </div>
        );
      })}

      <div className="space-y-3 border border-ink-100 bg-bone p-6">
        <p className="font-display text-sm text-ink">Collections Page — Section Headings</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-ink-500">Category Section Heading</label>
            <input
              type="text"
              value={values.collectionsRoomHeading}
              onChange={(e) => setValues((v) => ({ ...v, collectionsRoomHeading: e.target.value }))}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-500">Theme Section Heading</label>
            <input
              type="text"
              value={values.collectionsStyleHeading}
              onChange={(e) => setValues((v) => ({ ...v, collectionsStyleHeading: e.target.value }))}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
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
