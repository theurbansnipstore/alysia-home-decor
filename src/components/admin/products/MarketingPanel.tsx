"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import SeoPreview from "@/components/admin/seo/SeoPreview";
import { resolveProductSeo, MAX_TITLE_LEN, MAX_DESC_LEN } from "@/lib/seo/resolve";

interface MarketingPanelProps {
  productId: string;
  productName: string;
  productDescription: string;
  productSlug: string;
  productStatus: string;
  initial: {
    isFeatured: boolean;
    isBestSeller: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
    seoTitle: string | null;
    seoDesc: string | null;
  };
}

export default function MarketingPanel({ productId, productName, productDescription, productSlug, productStatus, initial }: MarketingPanelProps) {
  const router = useRouter();
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [isBestSeller, setIsBestSeller] = useState(initial.isBestSeller);
  const [isTrending, setIsTrending] = useState(initial.isTrending);
  const [isNewArrival, setIsNewArrival] = useState(initial.isNewArrival);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle ?? "");
  const [seoDesc, setSeoDesc] = useState(initial.seoDesc ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Mirrors exactly what generateMetadata() computes server-side for this
  // product (same resolveProductSeo() call) — updates live as the admin
  // types, so the preview never lags behind or drifts from reality.
  const preview = useMemo(
    () =>
      resolveProductSeo({
        name: productName,
        description: productDescription,
        seoTitle: seoTitle || null,
        seoDesc: seoDesc || null,
        status: productStatus,
      }),
    [productName, productDescription, seoTitle, seoDesc, productStatus]
  );

  async function save() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/marketing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFeatured,
          isBestSeller,
          isTrending,
          isNewArrival,
          seoTitle: seoTitle || null,
          seoDesc: seoDesc || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save marketing fields.");
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
      <h2 className="mb-1 font-display text-base text-ink">Marketing — {productName}</h2>
      {error && <p className="mb-3 border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}
      {success && <p className="mb-3 border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800">{success}</p>}

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-ink-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
          Best Seller
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isTrending} onChange={(e) => setIsTrending(e.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
          New Arrival
        </label>
      </div>

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
            placeholder={`Leave blank to auto-generate from the product name (preview below).`}
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-400">Beyond {MAX_TITLE_LEN} characters, search engines typically truncate the title.</p>
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
            placeholder="Leave blank to auto-generate from the product description."
            className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>

        <SeoPreview title={preview.title} description={preview.description} urlPath={`/product/${productSlug}`} />

        <p className="text-xs text-ink-400">
          Slug: <span className="font-mono text-ink-500">/product/{productSlug}</span> (edit in the main product form — changing it changes this
          product&apos;s URL). Indexing: {preview.noindex ? "excluded from search engines" : "eligible for search engines"} — automatic from this
          product&apos;s status ({productStatus}), not a separate setting.
        </p>
      </div>

      <div className="mt-4">
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save Marketing"}
        </Button>
      </div>
    </section>
  );
}
