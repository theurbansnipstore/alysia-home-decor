"use client";

import { useState, type FormEvent } from "react";
import type { SocialSettings, SocialLinkSetting } from "@/lib/settings/social";
import Button from "@/components/ui/Button";

export default function SocialContentForm({ initial }: { initial: SocialSettings }) {
  const [links, setLinks] = useState<SocialLinkSetting[]>(initial.links);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<SocialLinkSetting>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function move(index: number, direction: -1 | 1) {
    setLinks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((l, i) => ({ ...l, sortOrder: i }));
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/social", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: links.map((l, i) => ({ ...l, sortOrder: i })) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save social links.");
        return;
      }
      setMessage("Social links saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-3">
      <p className="text-xs text-ink-500">Only enabled platforms with a URL appear in the Footer. Leave a URL blank to keep a platform hidden.</p>
      {links.map((link, index) => (
        <div key={link.id} className="flex flex-wrap items-center gap-3 border border-ink-100 bg-bone p-3">
          <label className="flex w-28 shrink-0 items-center gap-2 text-xs text-ink-700">
            <input type="checkbox" checked={link.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
            {link.label}
          </label>
          <input
            type="url"
            placeholder={`https://...`}
            value={link.url}
            onChange={(e) => update(index, { url: e.target.value })}
            className="min-w-[220px] flex-1 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
              ↑
            </button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === links.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
              ↓
            </button>
          </div>
        </div>
      ))}

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
