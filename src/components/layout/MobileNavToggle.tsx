"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard } from "lucide-react";
import type { NavLink } from "@/types";

interface MobileNavToggleProps {
  links: NavLink[];
  /** First admin area this session's role can open, from getDefaultAdminHref(); null/undefined hides the entry (CUSTOMER, unauthenticated). */
  adminHref?: string | null;
}

export default function MobileNavToggle({ links, adminHref }: MobileNavToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-ink lg:hidden"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <nav aria-label="Mobile navigation" className="absolute left-0 top-full w-full border-t border-ink-100 bg-bone-100 px-4 py-3 shadow-card lg:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2 font-body text-sm text-ink-700" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Admin lives only here on mobile (not as a header icon) — role-gated
              via getDefaultAdminHref, visually distinct from ordinary nav links. */}
          {adminHref && (
            <div className="mt-2 border-t border-ink-200 pt-3">
              <Link
                href={adminHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2 font-body text-sm font-medium text-brass-600"
              >
                <LayoutDashboard size={16} aria-hidden />
                Admin
              </Link>
            </div>
          )}
        </nav>
      )}
    </>
  );
}
