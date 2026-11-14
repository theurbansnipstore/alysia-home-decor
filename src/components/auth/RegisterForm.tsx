"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import PasswordStrengthMeter from "@/components/ui/PasswordStrengthMeter";
import { registerSchema } from "@/lib/validations/auth";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Client-only checks — registerSchema's shape and the register API's
    // request contract are unchanged; confirmPassword/terms are never sent.
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Passwords do not match"] });
      return;
    }
    if (!acceptedTerms) {
      setFormError("Please accept the Terms & Conditions to continue.");
      return;
    }

    const parsed = registerSchema.safeParse({ name, email, password, phone, rememberMe });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }

      router.push("/account");
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
        <label htmlFor="name" className="mb-1 block text-sm text-ink-700">
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-clay">{fieldErrors.name[0]}</p>}
      </div>

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
        <label htmlFor="phone" className="mb-1 block text-sm text-ink-700">
          Phone
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.phone && <p className="mt-1 text-xs text-clay">{fieldErrors.phone[0]}</p>}
      </div>

      <div>
        <PasswordInput
          id="password"
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password?.[0]}
        />
        <PasswordStrengthMeter password={password} />
        {!fieldErrors.password && <p className="mt-1 text-xs text-ink-300">At least 8 characters.</p>}
      </div>

      <PasswordInput
        id="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword?.[0]}
      />

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 border-ink-100"
        />
        Remember me for 30 days
      </label>

      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 border-ink-100"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-brass-600 hover:text-brass">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brass-600 hover:text-brass">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brass-600 hover:text-brass">
          Sign in
        </Link>
      </p>
    </form>
  );
}
