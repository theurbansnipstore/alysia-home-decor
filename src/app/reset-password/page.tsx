import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { getBrandSettings } from "@/lib/config/brand";

// Module 32 Part 17 — same Server Component split as forgot-password
// (see that file's comment). The Suspense boundary Module 31 added around
// useSearchParams() moves here with the client component; behavior is
// unchanged, this page just gains a real noindex meta tag instead of
// relying on robots.txt alone.
export const metadata: Metadata = {
  title: `Set New Password — ${getBrandSettings().name}`,
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
