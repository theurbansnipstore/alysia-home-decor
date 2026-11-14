import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import AccountNav from "@/components/account/AccountNav";
import LogoutButton from "@/components/auth/LogoutButton";
import { getVisibleAccountNavItems } from "@/lib/config/account-nav";
import { getAccountSettings } from "@/lib/settings/account";

/** Applies to every /account/* page (orders, addresses, reviews) — private, per-customer content, never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [session, accountSettings] = await Promise.all([requireSession(), getAccountSettings()]);
  const navItems = getVisibleAccountNavItems(accountSettings);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-brass-600">{accountSettings.heading}</p>
          <h1 className="font-display text-3xl text-ink">{session.name}</h1>
          {accountSettings.welcomeMessage && <p className="mt-1 text-sm text-ink-500">{accountSettings.welcomeMessage}</p>}
        </div>
        <LogoutButton />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <AccountNav items={navItems} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
