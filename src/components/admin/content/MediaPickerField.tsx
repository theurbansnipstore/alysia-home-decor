"use client";

import { useState } from "react";
import type { MediaItemSetting } from "@/lib/settings/media";
import { checkImageUrl } from "@/lib/config/image-domains";

interface MediaPickerFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

/**
 * Module 38 Part 3 — a plain URL/path text input (unchanged, still the
 * primary way to set an image field, including relative paths like
 * "/logo.svg" that aren't in Media at all) plus an optional "Browse Media"
 * dropdown that fills it in from the saved Media library. Fetches the
 * Media list lazily (only when opened), so forms that never touch it pay
 * no extra request. This does not create a second image-storage system —
 * it only reads from the same store_media Setting the Media admin screen
 * already manages.
 */
export default function MediaPickerField({ label, value, onChange, placeholder }: MediaPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItemSetting[] | null>(null);
  const [loading, setLoading] = useState(false);
  const urlCheck = checkImageUrl(value);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/content/media");
        const json = await res.json();
        if (json.success) setItems(json.data.items);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="block text-xs text-ink-500">{label}</label>
        <button type="button" onClick={toggleOpen} className="text-xs text-brass-600 hover:underline">
          {open ? "Close" : "Browse Media"}
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
      />
      {!urlCheck.ok && <p className="mt-1 text-xs text-clay">{urlCheck.message}</p>}
      {open && (
        <div className="mt-2 max-h-56 overflow-y-auto border border-ink-100 bg-bone p-3">
          {loading && <p className="text-xs text-ink-500">Loading…</p>}
          {!loading && items && items.length === 0 && (
            <p className="text-xs text-ink-500">No saved images in Content → Media yet.</p>
          )}
          {!loading && items && items.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => (
                // eslint-disable-next-line @next/next/no-img-element
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.url);
                    setOpen(false);
                  }}
                  className={`border p-1 text-left ${value === item.url ? "border-brass" : "border-ink-100"}`}
                  title={item.label}
                >
                  <img src={item.url} alt={item.altText} className="aspect-square w-full rounded-sm object-cover" />
                  <span className="mt-1 block truncate text-[10px] text-ink-500">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
