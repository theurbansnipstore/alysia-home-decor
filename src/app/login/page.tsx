import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "@/components/auth/LoginForm";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = { title: `Sign In — ${getBrandSettings().name}`, robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const session = await getSession();
  if (session) {
    redirect("/account");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="mb-2 text-center font-mono text-xs uppercase tracking-widest text-brass-600">
        Welcome back
      </p>
      <h1 className="mb-8 text-center font-display text-3xl text-ink">Sign in</h1>
      <LoginForm redirectTo={searchParams.redirect} />
    </div>
  );
}
