"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { changePasswordSchema } from "@/lib/validations/auth";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccessMessage(json.data?.message || "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      {successMessage && (
        <p role="status" className="border border-brass/40 bg-brass/5 px-4 py-3 text-sm text-brass-600">
          {successMessage}
        </p>
      )}

      <div>
        <label htmlFor="currentPassword" className="mb-1 block text-sm text-ink-700">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.currentPassword && (
          <p className="mt-1 text-xs text-clay">{fieldErrors.currentPassword[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm text-ink-700">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.newPassword && <p className="mt-1 text-xs text-clay">{fieldErrors.newPassword[0]}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm text-ink-700">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-xs text-clay">{fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
