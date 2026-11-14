"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SeoPreview from "@/components/admin/seo/SeoPreview";
import { resolveCategorySeo, MAX_TITLE_LEN, MAX_DESC_LEN } from "@/lib/seo/resolve";

interface CategorySeoPanelProps {
  categoryId: string;
  categoryName: string;
  categoryDescription: string | null;
  categorySlug: string;
  categoryIsVisible: boolean;
  initial: { seoTitle: string | null; seoDesc: string | null };
}

export default function CategorySeoPanel({ categoryId, categoryName, categoryDescription, categorySlug, categoryIsVisible, initial }: CategorySeoPanelProps) {
  const router = useRouter();
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(initial.seoDesc ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () =>
      resolveCategorySeo({
        name: categoryName,
        description: categoryDescription,
        seoTitle: seoTitle || null,
        seoDesc: seoDesc || null,
        isVisible: categoryIsVisible,
      }),
    [categoryName, categoryDescription, seoTitle, seoDesc, categoryIsVisible]
  );

  async function save() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/seo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoTitle: seoTitle || null, seoDesc: seoDesc || null }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save SEO fields.");
        return;
      }
      setSuccess("Saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-ink-100 bg-bone p-5">
      <h2 className="mb-1 font-display text-base text-ink">SEO — {categoryName}</h2>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}
      {success && <p className="mb-3 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-xs text-ink-500">SEO Title</label>
            <span className={`text-xs ${seoTitle.length > MAX_TITLE_LEN ? "text-clay" : "text-ink-300"}`}>
              {seoTitle.length}/{MAX_TITLE_LEN}
            </span>
          </div>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder="Leave blank to auto-generate from the category name (preview below)."
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-xs text-ink-500">SEO Description</label>
            <span className={`text-xs ${seoDesc.length > MAX_DESC_LEN ? "text-clay" : "text-ink-300"}`}>
              {seoDesc.length}/{MAX_DESC_LEN}
            </span>
          </div>
          <textarea
            rows={3}
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            placeholder="Leave blank to auto-generate from the category description."
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>

        <SeoPreview title={preview.title} description={preview.description} urlPath={`/categories/${categorySlug}`} />

        <p className="text-xs text-ink-400">
          Slug: <span className="font-mono text-ink-500">/categories/{categorySlug}</span>. Indexing:{" "}
          {preview.noindex ? "excluded from search engines" : "eligible for search engines"} — automatic from this category&apos;s visibility, not a
          separate setting. Name, slug, and visibility are managed elsewhere; this screen only controls search-engine metadata.
        </p>
      </div>

      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save SEO"}
        </Button>
      </div>
    </section>
  );
}
