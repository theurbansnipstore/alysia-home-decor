"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";

interface NewsletterProps {
  variant?: "full" | "compact";
  title?: string;
  description?: string;
}

export default function Newsletter({
  variant = "full",
  title = "Join our circle",
  description = "New collections, artisan stories, and the occasional considered offer. Nothing else.",
}: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Newsletter subscription storage/API is out of scope for Module 4 —
    // this is placeholder UI, ready to wire into a real endpoint later.
    setSubmitted(true);
  }

  if (variant === "compact") {
    return (
      <div>
        <p className="mb-3 text-sm text-ink-100">Occasional notes on new collections. No spam.</p>
        {submitted ? (
          <p className="text-sm text-brass-400">Thanks — you&apos;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email address"
              className="w-full border border-ink-500 bg-transparent px-3 py-2 text-sm placeholder:text-ink-300 focus:border-brass focus:outline-none"
            />
            <button
              type="submit"
              className="border border-l-0 border-ink-500 px-4 text-sm text-brass-400 transition-colors hover:bg-ink-700"
            >
              Join
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Stay in touch</p>
      <h2 className="mb-3 font-display text-3xl text-ink">{title}</h2>
      <p className="mb-8 text-sm text-ink-500">{description}</p>
      {submitted ? (
        <p className="text-brass-600">Thanks — you&apos;re on the list.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            aria-label="Email address"
            className="w-full border border-ink-100 bg-bone-100 px-4 py-3 text-sm focus:border-brass focus:outline-none"
          />
          <Button type="submit" variant="primary">
            Subscribe
          </Button>
        </form>
      )}
    </div>
  );
}
