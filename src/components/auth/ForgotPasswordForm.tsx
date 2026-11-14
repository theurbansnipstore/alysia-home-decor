"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

const GENERIC_MESSAGE = "If an account with that email exists, we've sent a password reset link to it.";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // A genuine failure (bad request, server error) — never reached for
        // "email not found", since that always returns the generic success
        // message instead.
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass">
        <Mail size={20} aria-hidden />
      </div>

      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Account Recovery</p>
      <h1 className="mb-3 font-display text-3xl text-ink">Reset your password</h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-500">
        Enter the email on your account and we'll send you a link to reset your password.
      </p>

      {submitted ? (
        <p className="border border-sage-600/40 bg-sage-100 px-4 py-3 text-sm text-sage-600">{GENERIC_MESSAGE}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="border border-clay/40 bg-clay/5 px-4 py-2 text-sm text-clay">{error}</p>}
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm text-ink-700">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      )}

      <Link href="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm text-ink-500 hover:text-brass-600">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </div>
  );
}
