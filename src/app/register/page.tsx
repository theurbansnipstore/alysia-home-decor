import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import RegisterForm from "@/components/auth/RegisterForm";
import { getBrandSettings } from "@/lib/config/brand";

export const metadata: Metadata = { title: `Create Account — ${getBrandSettings().name}`, robots: { index: false, follow: false } };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/account");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <p className="mb-2 text-center font-mono text-xs uppercase tracking-widest text-brass-600">
        Join us
      </p>
      <h1 className="mb-8 text-center font-display text-3xl text-ink">Create your account</h1>
      <RegisterForm />
    </div>
  );
}
