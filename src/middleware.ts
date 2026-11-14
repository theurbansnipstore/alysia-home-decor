import { NextResponse, type NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { REVIEW_MODERATOR_ROLES } from "@/lib/admin/review-roles";
import { CUSTOMER_AREA_ROLES } from "@/lib/admin/customer-roles";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { USER_MANAGEMENT_ROLES } from "@/lib/admin/users-roles";
import { INTEGRATION_AREA_ROLES } from "@/lib/admin/integration-roles";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "kutir_session";

interface ProtectedRoute {
  prefix: string;
  /** Omit to allow any authenticated user regardless of role. */
  roles?: Role[];
}

// Add new entries here as future modules introduce protected areas.
// Remember to also add the matching path to `config.matcher` below —
// Next.js only runs middleware for paths listed there.
//
// /admin is page-level gating only (redirects to /login on failure).
// /api/admin/** is deliberately NOT listed here — API routes return
// 401/403 JSON via requireApiRole() (see src/lib/admin/api-auth.ts)
// instead of being redirected.
//
// Order matters: more-specific prefixes must come before the general
// "/admin" entry below, since middleware() takes the FIRST match. This is
// how /admin/orders gets its own (Module 12) role list — ORDER_MANAGER and
// SUPPORT_STAFF — without widening or touching the existing /admin/products
// (Module 10) role list at all.
const protectedRoutes: ProtectedRoute[] = [
  { prefix: "/account" },
  { prefix: "/admin/orders", roles: ORDER_AREA_ROLES },
  { prefix: "/admin/reviews", roles: REVIEW_MODERATOR_ROLES },
  // Customers includes SUPPORT_STAFF, same as Orders — the general "/admin"
  // rule below doesn't include SUPPORT_STAFF, so (as with Orders/Reviews
  // before) this needs its own entry or that role would get redirected by
  // middleware before ever reaching the page's own requireRole() check.
  { prefix: "/admin/customers", roles: CUSTOMER_AREA_ROLES },
  { prefix: "/admin/settings", roles: SETTINGS_AREA_ROLES },
  { prefix: "/admin/content", roles: CONTENT_AREA_ROLES },
  // Users & Roles is SUPER_ADMIN-only — the general "/admin" rule below
  // includes ADMIN/MANAGER/INVENTORY_STAFF/MARKETING_STAFF, none of which
  // should reach this specific area, so (unlike Content/Settings, which
  // are already subsets of the general rule) this entry is load-bearing,
  // not just a tightening.
  { prefix: "/admin/users", roles: USER_MANAGEMENT_ROLES },
  // Integrations is SUPER_ADMIN/ADMIN-only, same reasoning as Users above —
  // a strict subset of the general "/admin" rule, so this entry is
  // load-bearing, not just a tightening.
  { prefix: "/admin/integrations", roles: INTEGRATION_AREA_ROLES },
  // Category SEO (Module 31) — MARKETING_ADMIN_ROLES excludes
  // INVENTORY_STAFF, unlike the general "/admin" rule below, so this entry
  // is load-bearing, same reasoning as Users/Integrations above.
  { prefix: "/admin/categories", roles: MARKETING_ADMIN_ROLES },
  { prefix: "/admin", roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "INVENTORY_STAFF", "MARKETING_STAFF"] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rule = protectedRoutes.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (rule.roles && !rule.roles.includes(payload.role as Role)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
