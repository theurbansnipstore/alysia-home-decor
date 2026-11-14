"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { AccountSettings } from "@/lib/settings/account";
import Button from "@/components/ui/Button";

export default function AccountSettingsForm({ initial }: { initial: AccountSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof AccountSettings>(key: K) {
    return {
      value: values[key] as string,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save account settings.");
        return;
      }
      setMessage("Customer account settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-ink-100 bg-bone p-6">
      <p className="text-xs text-ink-500">
        Orders and Addresses always stay visible — they're required account functions, not optional content.
      </p>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Account Page Heading</label>
        <input type="text" required {...field("heading")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Welcome Message (optional)</label>
        <input type="text" {...field("welcomeMessage")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={values.showWishlistTab} onChange={(e) => setValues((v) => ({ ...v, showWishlistTab: e.target.checked }))} className="h-4 w-4 border-ink-100" />
        Show Wishlist tab in account dashboard
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={values.showReviewsTab} onChange={(e) => setValues((v) => ({ ...v, showReviewsTab: e.target.checked }))} className="h-4 w-4 border-ink-100" />
        Show Reviews tab in account dashboard
      </label>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
