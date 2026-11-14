import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { getBrandSettings } from "@/lib/config/brand";

// Module 32 Part 17 — was a "use client" page, which can't export
// `metadata` (Next.js only reads it from Server Component page modules),
// so it relied on robots.txt disallow alone. Splitting the interactive
// form into its own client component (identical pattern to login/register)
// lets this page stay a Server Component and carry its own noindex meta,
// with zero change to the form's behavior.
export const metadata: Metadata = {
  title: `Reset Your Password — ${getBrandSettings().name}`,
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
