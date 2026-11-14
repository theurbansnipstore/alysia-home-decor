"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";

interface ContactFormProps {
  submitLabel?: string;
  successMessage?: string;
}

export default function ContactForm({ submitLabel = "Send Message", successMessage = "Thank you — your message has been received. We'll get back to you as soon as we can." }: ContactFormProps = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject: subject.trim() || undefined, message }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error || "Couldn't send your message. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <div className="border border-ink-100 bg-bone p-6 text-sm text-ink-700">{successMessage}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-xs text-ink-500">
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-ink-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1 block text-xs text-ink-500">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-ink-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-xs text-ink-500">
          Subject (optional)
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Order question, product question, something else…"
          className="w-full border border-ink-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-xs text-ink-500">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-ink-100 px-3 py-2 text-sm focus:border-brass focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-xs text-clay">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Sending…" : submitLabel}
      </Button>
    </form>
  );
}
