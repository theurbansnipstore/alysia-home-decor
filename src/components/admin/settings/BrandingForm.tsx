"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { BrandingSettings } from "@/lib/settings/branding";
import Button from "@/components/ui/Button";
import MediaPickerField from "@/components/admin/content/MediaPickerField";

export default function BrandingForm({ initial }: { initial: BrandingSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof BrandingSettings>(key: K) {
    return {
      value: values[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save branding settings.");
        return;
      }
      setMessage("Branding settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 border border-ink-100 bg-bone p-6">
      <div>
        <label className="mb-1 block text-xs text-ink-500">Store Name</label>
        <input type="text" required {...field("name")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Tagline</label>
        <input type="text" {...field("tagline")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <MediaPickerField label="Logo URL / Path" value={values.logoUrl} onChange={(v) => setValues((s) => ({ ...s, logoUrl: v }))} placeholder="/logo.svg" />
          <p className="mt-1 text-xs text-ink-400">Use a transparent PNG or SVG with good resolution. The header controls how big it displays — any shape (wide, square, tall) fits without stretching.</p>
        </div>
        <div>
          <MediaPickerField label="Favicon URL / Path" value={values.faviconUrl} onChange={(v) => setValues((s) => ({ ...s, faviconUrl: v }))} placeholder="/icon.svg" />
          <p className="mt-1 text-xs text-ink-400">Use a square icon with little to no empty space around it. Browsers always show favicons very small (the size of a browser tab icon), so fine detail won&apos;t be visible.</p>
        </div>
      </div>

      {/* Module 42 — live preview so the admin can see the actual displayed
          size/shape before saving, instead of guessing from a URL string.
          Plain <img>, not next/image, matching MediaPickerField's existing
          convention just above — an in-progress URL the admin is typing
          may not be in next.config.js's remotePatterns yet. */}
      <div className="border border-ink-100 bg-bone-100 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-ink-500">Preview</p>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs text-ink-500">Header (as shown on the storefront)</p>
            <div className="flex items-center border border-ink-100 bg-bone px-4 py-3">
              {values.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={values.logoUrl} alt={values.name || "Logo"} className="h-11 w-36 object-contain object-left" />
              ) : (
                <span className="text-sm text-ink-400">No logo set — store name will not appear as an image here.</span>
              )}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-500">
              Footer — displays your Store Name as text (<span className="font-display">{values.name || "Store Name"}</span>), not an image logo. There is nothing to resize here.
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs text-ink-500">Favicon — actual browser tab size (16×16 and 32×32)</p>
            <div className="flex items-center gap-4 border border-ink-100 bg-bone px-4 py-3">
              {values.faviconUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={values.faviconUrl} alt="Favicon at 16px" className="h-4 w-4 object-contain" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={values.faviconUrl} alt="Favicon at 32px" className="h-8 w-8 object-contain" />
                  <span className="text-xs text-ink-400">This is genuinely how small a favicon looks everywhere it&apos;s used — that&apos;s normal, not a bug.</span>
                </>
              ) : (
                <span className="text-sm text-ink-400">No favicon set.</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Default SEO Title</label>
        <input type="text" {...field("seoDefaultTitle")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Default SEO Description</label>
        <textarea rows={2} {...field("seoDefaultDescription")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <MediaPickerField label="Default Social Share Image URL" value={values.ogImageUrl} onChange={(v) => setValues((s) => ({ ...s, ogImageUrl: v }))} />

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
