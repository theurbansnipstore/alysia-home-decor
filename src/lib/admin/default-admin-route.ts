import type { Role } from "@prisma/client";
import { DASHBOARD_OVERVIEW_ROLES } from "@/lib/admin/dashboard-roles";
import { PRODUCT_AREA_ROLES } from "@/lib/admin/roles";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { CUSTOMER_AREA_ROLES } from "@/lib/admin/customer-roles";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";

/**
 * Mirrors AdminNav's GROUPS order exactly. /admin (Dashboard Overview) is
 * SUPER_ADMIN/ADMIN-only — every other role hitting it gets silently
 * bounced to "/" by requireRole. The site-header Admin link needs to land
 * each role on the first area it can actually open, not always /admin.
 */
const ORDERED_ADMIN_AREAS: { roles: Role[]; href: string }[] = [
  { roles: DASHBOARD_OVERVIEW_ROLES, href: "/admin" },
  { roles: PRODUCT_AREA_ROLES, href: "/admin/products" },
  { roles: ORDER_AREA_ROLES, href: "/admin/orders" },
  { roles: REVIEW_MODERATOR_ROLES, href: "/admin/reviews" },
  { roles: CUSTOMER_AREA_ROLES, href: "/admin/customers" },
  { roles: CONTENT_AREA_ROLES, href: "/admin/content" },
  { roles: SETTINGS_AREA_ROLES, href: "/admin/settings" },
  { roles: USER_MANAGEMENT_ROLES, href: "/admin/users" },
];

/** Returns the first admin area this role can open, or null for CUSTOMER
 *  (and any future role with no admin area at all). */
export function getDefaultAdminHref(role: Role): string | null {
  return ORDERED_ADMIN_AREAS.find((area) => area.roles.includes(role))?.href ?? null;
}
