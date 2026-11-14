"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import AdminNav from "@/components/admin/AdminNav";
import LogoutButton from "@/components/auth/LogoutButton";

interface AdminShellProps {
  userName: string;
  role: Role;
  children: ReactNode;
  brandName: string;
}

/**
 * Shopify-style shell: persistent left sidebar on desktop, off-canvas
 * drawer on mobile/tablet. Only this component owns the responsive
 * open/close state — AdminNav itself stays a plain, reusable nav list with
 * no layout opinions, so it can't drift out of sync with how it's mounted.
 *
 * Module 37 Part 13 fix: on desktop, the base "fixed inset-y-0 left-0
 * z-50" classes stayed active alongside lg:sticky (position: sticky
 * correctly overrides position: fixed at lg widths, but left-0/z-50 were
 * never undone for desktop). On a page wide enough to force horizontal
 * scroll (a wide admin table, etc.), a sticky element with left:0 sticks
 * horizontally too, and its z-50 then painted it over the header (z-30)
 * as the user scrolled sideways -- "sidebar overlapping the header on
 * scroll". lg:inset-auto + lg:z-0 clear that back to auto/low-priority at
 * desktop widths; lg:top-0 still wins for the actual sticky-to-top
 * behavior (same "inset" utility family, later in Tailwind's generated
 * stylesheet). Mobile drawer behavior (fixed/inset-0/z-50, only active
 * below lg) is unchanged.
 */
export default function AdminShell({ userName, role, children, brandName }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bone-100 lg:flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform overflow-y-auto border-r border-ink-100 bg-bone transition-transform duration-200 ease-out lg:sticky lg:inset-auto lg:top-0 lg:z-0 lg:h-screen lg:w-60 lg:translate-x-0 lg:transition-none ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-4">
          <div className="leading-tight">
            <p className="font-display text-lg text-ink">{brandName}</p>
            <p className="text-[11px] uppercase tracking-widest text-ink-400">Admin</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="text-ink-500 hover:text-ink lg:hidden"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <AdminNav role={role} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-100 bg-bone/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="text-ink-700 hover:text-brass-600 lg:hidden"
          >
            <Menu size={22} aria-hidden />
          </button>

          <div className="ml-auto flex items-center gap-3 text-sm text-ink-600">
            <span className="hidden sm:inline">
              {userName} <span className="text-ink-300">·</span>{" "}
              <span className="text-ink-400">{role.replace(/_/g, " ")}</span>
            </span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
