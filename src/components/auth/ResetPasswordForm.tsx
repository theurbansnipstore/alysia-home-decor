"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "This reset link could not be used.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <p className="mb-6 border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay">
          This reset link is missing its token. Request a new one below.
        </p>
        <Link href="/forgot-password" className="text-sm text-brass-600 hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass">
        <KeyRound size={20} aria-hidden />
      </div>

      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass-600">Account Recovery</p>
      <h1 className="mb-3 font-display text-3xl text-ink">Set a new password</h1>

      {success ? (
        <>
          <p className="mb-6 border border-sage-600/40 bg-sage-100 px-4 py-3 text-sm text-sage-600">
            Your password has been reset. Redirecting you to sign in…
          </p>
          <Link href="/login" className="text-sm text-brass-600 hover:underline">
            Go to login now
          </Link>
        </>
      ) : (
        <>
          <p className="mb-8 text-sm leading-relaxed text-ink-500">Choose a new password for your account.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay">
                {error}
                {(error.includes("expired") || error.includes("invalid") || error.includes("already been used")) && (
                  <>
                    {" "}
                    <Link href="/forgot-password" className="underline hover:text-clay">
                      Request a new link
                    </Link>
                    .
                  </>
                )}
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm text-ink-700">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-sm text-ink-700">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Reset Password"}
            </Button>
          </form>
        </>
      )}

      <Link href="/login" className="mt-8 flex items-center justify-center gap-1.5 text-sm text-ink-500 hover:text-brass-600">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </div>
  );
}
