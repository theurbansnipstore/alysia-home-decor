"use client";

import { useState, type FormEvent } from "react";
import type { FooterSettings, FooterColumnSetting, FooterLinkSetting } from "@/lib/settings/footer";
import Button from "@/components/ui/Button";

function newLink(sortOrder: number): FooterLinkSetting {
  return { id: `link-${Date.now()}`, label: "", href: "/", enabled: true, sortOrder };
}

function newColumn(sortOrder: number): FooterColumnSetting {
  return { id: `col-${Date.now()}`, heading: "", sortOrder, links: [] };
}

export default function FooterContentForm({ initial }: { initial: FooterSettings }) {
  const [description, setDescription] = useState(initial.description);
  const [copyrightText, setCopyrightText] = useState(initial.copyrightText);
  const [columns, setColumns] = useState<FooterColumnSetting[]>(initial.columns);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateColumn(colIndex: number, patch: Partial<FooterColumnSetting>) {
    setColumns((prev) => prev.map((c, i) => (i === colIndex ? { ...c, ...patch } : c)));
  }

  function removeColumn(colIndex: number) {
    setColumns((prev) => prev.filter((_, i) => i !== colIndex));
  }

  function updateLink(colIndex: number, linkIndex: number, patch: Partial<FooterLinkSetting>) {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIndex ? { ...c, links: c.links.map((l, j) => (j === linkIndex ? { ...l, ...patch } : l)) } : c))
    );
  }

  function removeLink(colIndex: number, linkIndex: number) {
    setColumns((prev) => prev.map((c, i) => (i === colIndex ? { ...c, links: c.links.filter((_, j) => j !== linkIndex) } : c)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/footer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          copyrightText,
          columns: columns.map((c, i) => ({ ...c, sortOrder: i, links: c.links.map((l, j) => ({ ...l, sortOrder: j })) })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save footer.");
        return;
      }
      setMessage("Footer saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="border border-ink-100 bg-bone p-4">
        <label className="mb-1 block text-xs text-ink-500">Footer Description (optional)</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mb-3 w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
        <label className="mb-1 block text-xs text-ink-500">Copyright Text (year is added automatically)</label>
        <input type="text" value={copyrightText} onChange={(e) => setCopyrightText(e.target.value)} className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>

      {columns.map((col, colIndex) => (
        <div key={col.id} className="border border-ink-100 bg-bone p-4">
          <div className="mb-3 flex items-center gap-3">
            <input
              type="text"
              required
              placeholder="Column heading"
              value={col.heading}
              onChange={(e) => updateColumn(colIndex, { heading: e.target.value })}
              className="flex-1 border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
            />
            <button type="button" onClick={() => removeColumn(colIndex)} className="text-xs text-clay hover:underline">
              Remove Column
            </button>
          </div>

          <div className="space-y-2">
            {col.links.map((link, linkIndex) => (
              <div key={link.id} className="flex flex-wrap items-center gap-2">
                <input type="checkbox" checked={link.enabled} onChange={(e) => updateLink(colIndex, linkIndex, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
                <input
                  type="text"
                  required
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) => updateLink(colIndex, linkIndex, { label: e.target.value })}
                  className="w-28 border border-ink-100 bg-bone-100 px-2 py-1.5 text-sm focus:border-brass focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="/path"
                  value={link.href}
                  onChange={(e) => updateLink(colIndex, linkIndex, { href: e.target.value })}
                  className="min-w-[140px] flex-1 border border-ink-100 bg-bone-100 px-2 py-1.5 text-sm focus:border-brass focus:outline-none"
                />
                <button type="button" onClick={() => removeLink(colIndex, linkIndex)} className="text-xs text-clay hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => updateColumn(colIndex, { links: [...col.links, newLink(col.links.length)] })}
            className="mt-3 text-xs text-brass-600 hover:underline"
          >
            + Add Link
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setColumns((prev) => [...prev, newColumn(prev.length)])}
        className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass"
      >
        + Add Column
      </button>

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
