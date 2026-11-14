import type { Role } from "@prisma/client";

/** Marketing-owned customer-facing content (Homepage, Navigation, Footer, Social, About, Contact, FAQ, Shipping, Returns, Careers) — same rationale as MARKETING_STAFF already owning product SEO/marketing fields. */
export const CONTENT_AREA_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MARKETING_STAFF"];

export function canManageContent(role: Role): boolean {
  return CONTENT_AREA_ROLES.includes(role);
}
