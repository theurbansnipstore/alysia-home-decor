"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { updateProfileSchema } from "@/lib/validations/auth";

interface ProfileFormProps {
  initialName: string;
  initialPhone: string;
}

export default function ProfileForm({ initialName, initialPhone }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const parsed = updateProfileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccessMessage("Profile updated.");
      router.refresh(); // re-fetches the Server Component's display data (name in the page header, etc.)
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
        <label htmlFor="profile-name" className="mb-1 block text-sm text-ink-700">
          Full name
        </label>
        <input
          id="profile-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-clay">{fieldErrors.name[0]}</p>}
      </div>

      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-sm text-ink-700">
          Phone
        </label>
        <input
          id="profile-phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-ink-100 bg-bone-100 px-3 py-2 text-sm text-charcoal focus:border-brass focus:outline-none"
        />
        {fieldErrors.phone && <p className="mt-1 text-xs text-clay">{fieldErrors.phone[0]}</p>}
      </div>

      <Button type="submit" variant="secondary" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
