"use client";

import { useState, type FormEvent } from "react";
import type { FaqSettings, FaqItemSetting } from "@/lib/settings/faq";
import Button from "@/components/ui/Button";

function newItem(sortOrder: number): FaqItemSetting {
  return { id: `faq-${Date.now()}`, question: "", answer: "", category: "", enabled: true, sortOrder };
}

export default function FaqContentForm({ initial }: { initial: FaqSettings }) {
  const [items, setItems] = useState<FaqItemSetting[]>(initial.items);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<FaqItemSetting>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((it, i) => ({ ...it, sortOrder: i }));
    });
  }

  function addItem() {
    setItems((prev) => [...prev, newItem(prev.length)]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/faq", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((it, i) => ({ ...it, sortOrder: i })) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save FAQ.");
        return;
      }
      setMessage("FAQ saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
      {items.length === 0 && <p className="border border-ink-100 bg-bone p-6 text-center text-sm text-ink-500">No FAQ items yet.</p>}

      {items.map((item, index) => (
        <div key={item.id} className="border border-ink-100 bg-bone p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-ink-500">
              <input type="checkbox" checked={item.enabled} onChange={(e) => update(index, { enabled: e.target.checked })} className="h-4 w-4 border-ink-100" />
              Enabled
            </label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="text-ink-500 hover:text-brass-600 disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => remove(index)} className="text-clay hover:underline">
                Remove
              </button>
            </div>
          </div>
          <input
            type="text"
            required
            placeholder="Question"
            value={item.question}
            onChange={(e) => update(index, { question: e.target.value })}
            className="mb-2 w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <textarea
            required
            rows={3}
            placeholder="Answer"
            value={item.answer}
            onChange={(e) => update(index, { answer: e.target.value })}
            className="mb-2 w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
          <input
            type="text"
            placeholder="Category (optional)"
            value={item.category}
            onChange={(e) => update(index, { category: e.target.value })}
            className="w-full max-w-xs border border-ink-100 bg-bone-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      ))}

      <button type="button" onClick={addItem} className="border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:border-brass">
        + Add Question
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
