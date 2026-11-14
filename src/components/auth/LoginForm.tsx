"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import { loginSchema } from "@/lib/validations/auth";

interface LoginFormProps {
  redirectTo?: string;
}

/**
 * Module 40 Part 2 — redirectTo comes straight from the ?redirect= query
 * string middleware.ts sets when bouncing an unauthenticated visitor to
 * /login, but as a query param it's just as reachable by anyone crafting
 * their own /login?redirect=... link. Only a same-origin relative path is
 * accepted; anything else (an absolute URL, or a protocol-relative
 * "//evil.example.com" — which browsers treat as same-scheme-absolute)
 * falls back to the safe default instead of being handed to the router.
 * Every legitimate caller (middleware.ts) only ever sets a real in-app
 * pathname, so this changes nothing for real usage.
 */
function safeRedirectPath(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/account";
  return path;
}

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ email, password, rememberMe });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(safeRedirectPath(redirectTo));
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <p role="alert" className="border border-clay/40 bg-clay/5 px-4 py-3 text-sm text-clay">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-ink-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.email && <p className="mt-1 text-xs text-clay">{fieldErrors.email[0]}</p>}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="password" className="text-sm text-ink-700">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs text-brass-600 hover:text-brass">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          label=""
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password?.[0]}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 border-ink-100"
        />
        Remember me for 30 days
      </label>

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      <div className="space-y-2 text-center text-sm text-ink-500">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brass-600 hover:text-brass">
            Create one
          </Link>
        </p>
        <p>
          <Link href="/shop" className="text-ink-500 hover:text-brass-600">
            Continue as guest →
          </Link>
        </p>
      </div>
    </form>
  );
}
