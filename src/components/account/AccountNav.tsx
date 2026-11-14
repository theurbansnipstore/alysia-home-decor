"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AccountNavItem } from "@/lib/config/account-nav";

export default function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  return (
    <nav aria-label="Account navigation" className="lg:w-56 lg:shrink-0">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          if (item.status === "comingSoon") {
            return (
              <li key={item.href} className="shrink-0">
                <span
                  aria-disabled="true"
                  className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm text-ink-300"
                >
                  {item.label}
                  <span className="text-[10px] uppercase tracking-wide">Soon</span>
                </span>
              </li>
            );
          }

          // item.href may carry a query string (e.g. "/account?tab=wishlist")
          // — usePathname() never includes it, so it's compared separately
          // against the current ?tab= value.
          const [itemPath, itemQuery] = item.href.split("?");
          const itemTab = itemQuery ? new URLSearchParams(itemQuery).get("tab") : null;
          const isActive = pathname === itemPath && currentTab === itemTab;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`block whitespace-nowrap px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-ink text-bone-100" : "text-ink-700 hover:text-brass-600"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
