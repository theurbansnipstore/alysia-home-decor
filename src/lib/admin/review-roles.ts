import type { Role } from "@prisma/client";

/**
 * Separate from src/lib/admin/roles.ts (products) and order-roles.ts
 * (orders) by design — review moderation is its own permission domain.
 * Per approved decision: SUPER_ADMIN/ADMIN always have full access;
 * MARKETING_STAFF (owns customer-facing trust content) and SUPPORT_STAFF
 * (already customer-facing) are both allowed to moderate reviews. No new
 * role is introduced.
 */
export const REVIEW_MODERATOR_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MARKETING_STAFF", "SUPPORT_STAFF"];

export function canModerateReviews(role: Role): boolean {
  return REVIEW_MODERATOR_ROLES.includes(role);
}
