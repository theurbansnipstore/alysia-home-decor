"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Star,
  Users,
  FileText,
  Settings as SettingsIcon,
  ShieldCheck,
  Bell,
  BarChart3,
  History,
  Plug,
  Search,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";
import { PRODUCT_AREA_ROLES, STOCK_ADMIN_ROLES, MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { DASHBOARD_OVERVIEW_ROLES } from "@/lib/admin/dashboard-roles";
import { CUSTOMER_AREA_ROLES } from "@/lib/admin/customer-roles";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { NOTIFICATION_ADMIN_ROLES } from "@/lib/admin/notification-roles";
import { ACTIVITY_LOG_ADMIN_ROLES } from "@/lib/admin/activity-log-roles";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for admin navigation structure — both the
 * sidebar (this component) and the header's default-landing-page logic
 * (src/lib/admin/default-admin-route.ts) are built from the same
 * underlying role-area constants, so a role's visible links and its
 * default destination never disagree. No permission logic lives here:
 * every `roles` array below is imported unchanged from its existing
 * owning module — this file only decides what to show, never what to
 * allow. Server-side route protection (layout/page requireRole, API
 * requireApiRole, middleware) is unaffected by anything in this file.
 */
const GROUPS: NavGroup[] = [
  {
    label: "Store",
    items: [
      { href: "/admin", label: "Overview", roles: DASHBOARD_OVERVIEW_ROLES, icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", roles: DASHBOARD_OVERVIEW_ROLES, icon: BarChart3 },
      { href: "/admin/products", label: "Products", roles: PRODUCT_AREA_ROLES, icon: Package },
      { href: "/admin/import-export", label: "Import / Export", roles: PRODUCT_AREA_ROLES, icon: FileSpreadsheet },
      { href: "/admin/categories", label: "Category SEO", roles: MARKETING_ADMIN_ROLES, icon: Search },
      { href: "/admin/inventory", label: "Inventory", roles: STOCK_ADMIN_ROLES, icon: Boxes },
      { href: "/admin/orders", label: "Orders", roles: ORDER_AREA_ROLES, icon: ShoppingBag },
      { href: "/admin/reviews", label: "Reviews", roles: REVIEW_MODERATOR_ROLES, icon: Star },
      { href: "/admin/customers", label: "Customers", roles: CUSTOMER_AREA_ROLES, icon: Users },
    ],
  },
  {
    label: "Content",
    items: [{ href: "/admin/content", label: "Content", roles: CONTENT_AREA_ROLES, icon: FileText }],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/settings", label: "Settings", roles: SETTINGS_AREA_ROLES, icon: SettingsIcon }],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users & Roles", roles: USER_MANAGEMENT_ROLES, icon: ShieldCheck },
      { href: "/admin/notifications", label: "Notifications", roles: NOTIFICATION_ADMIN_ROLES, icon: Bell },
      { href: "/admin/activity-log", label: "Activity Log", roles: ACTIVITY_LOG_ADMIN_ROLES, icon: History },
      { href: "/admin/integrations", label: "Integrations", roles: INTEGRATION_AREA_ROLES, icon: Plug },
    ],
  },
];

export default function AdminNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-6 px-3 py-5">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          {/* Section heading — deliberately smaller, lighter, and not a
              link/button, so it can never be mistaken for a disabled nav
              item. Only the <Link>s below it are interactive. */}
          <p className="mb-1.5 select-none px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-300">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href) ?? false;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-brass/10 font-medium text-brass-700"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink"
                    }`}
                  >
                    <Icon size={17} className={isActive ? "text-brass-600" : "text-ink-400"} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
