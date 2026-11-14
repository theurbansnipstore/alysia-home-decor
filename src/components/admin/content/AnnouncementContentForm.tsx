"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { AnnouncementSettings } from "@/lib/settings/announcement";
import Button from "@/components/ui/Button";

export default function AnnouncementContentForm({ initial }: { initial: AnnouncementSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(key: keyof AnnouncementSettings) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: key === "enabled" ? e.target.checked : e.target.value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/announcement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save the announcement bar.");
        return;
      }
      setMessage("Announcement bar saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 border border-ink-100 bg-bone p-6">
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={values.enabled} onChange={handleChange("enabled")} className="h-4 w-4" />
        Show announcement bar
      </label>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Text</label>
        <input type="text" value={values.text} onChange={handleChange("text")} maxLength={150} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Link (optional — leave blank for plain text)</label>
        <input type="text" value={values.link} onChange={handleChange("link")} placeholder="/collections" className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
