"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import type { ContactSettings } from "@/lib/settings/contact";
import Button from "@/components/ui/Button";

export default function ContactContentForm({ initial }: { initial: ContactSettings }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof ContactSettings>(key: K) {
    return {
      value: values[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't save contact content.");
        return;
      }
      setMessage("Contact page content saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 border border-ink-100 bg-bone p-6">
      <p className="text-xs text-ink-500">
        Leave any field blank to hide it (or fall back to a sensible default) on the Contact page — none of these
        values are invented.
      </p>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Eyebrow (small label above the title)</label>
        <input type="text" placeholder="Get in touch" {...field("eyebrow")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Page Title</label>
        <input
          type="text"
          placeholder="Leave blank to use &quot;Contact [Store Name]&quot; automatically"
          {...field("title")}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Page Intro Text</label>
        <textarea rows={2} {...field("pageIntro")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Email</label>
        <input type="email" {...field("email")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Phone</label>
        <input type="text" {...field("phone")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Address</label>
        <textarea rows={2} {...field("address")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Business Hours</label>
        <input type="text" {...field("businessHours")} placeholder="e.g. Mon–Sat, 10am–6pm IST" className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Form Submit Button Label</label>
        <input type="text" placeholder="Send Message" {...field("formSubmitLabel")} className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-500">Form Success Message</label>
        <textarea
          rows={2}
          placeholder="Thank you — your message has been received. We'll get back to you as soon as we can."
          {...field("formSuccessMessage")}
          className="w-full border border-ink-100 bg-bone px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      {error && <p className="text-xs text-clay">{error}</p>}
      {message && <p className="text-xs text-sage-600">{message}</p>}

      <Button type="submit" variant="primary" size="sm" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
