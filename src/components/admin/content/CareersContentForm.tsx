"use client";

import { useState, type FormEvent } from "react";
import type { CareersSettings, CareerListingSetting } from "@/lib/settings/careers";
import Button from "@/components/ui/Button";

function newListing(): CareerListingSetting {
  return { id: `job-${Date.now()}`, title: "", description: "", enabled: true };
}

export default function CareersContentForm({ initial }: { initial: CareersSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateListing(index: number, patch: Partial<CareerListingSetting>) {
    setValues((v) => ({ ...v, listings: v.listings.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  }

  function removeListing(index: number) {
    setValues((v) => ({ ...v, listings: v.listings.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/careers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save Careers content.");
        return;
      }
      setMessage("Careers content saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      <div className="border border-ink-100 bg-bone p-4">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={values.enabled}
            onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))}
            className="h-4 w-4 border-ink-100"
          />
          Show Careers in navigation and footer
        </label>
        <p className="mt-1 text-xs text-ink-500">
          Off by default. The /careers page always stays reachable directly — turning this off only hides
          it from menus, it never 404s.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-500">Page Title</label>
        <input
          type="text"
          required
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Description</label>
        <textarea
          rows={3}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-ink-500">Open Positions</p>
        {values.listings.map((listing, index) => (
          <div key={listing.id} className="mb-3 border border-ink-100 bg-bone p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-ink-500">
                <input type="checkbox" checked={listing.enabled} onChange={(e) => updateListing(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
                Enabled
              </label>
              <button type="button" onClick={() => removeListing(index)} className="text-xs text-clay hover:underline">
                Remove
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="Job title"
              value={listing.title}
              onChange={(e) => updateListing(index, { title: e.target.value })}
              className="mb-2 w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            <textarea
              required
              rows={2}
              placeholder="Description"
              value={listing.description}
              onChange={(e) => updateListing(index, { description: e.target.value })}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setValues((v) => ({ ...v, listings: [...v.listings, newListing()] }))}
          className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
        >
          + Add Listing
        </button>
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
