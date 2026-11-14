import type { Role } from "@prisma/client";

/**
 * Staff/admin account + role management is SUPER_ADMIN-only, full stop —
 * per this module's explicit instruction ("SUPER_ADMIN should have
 * authority to manage staff/admin users") and because it's the one admin
 * area that can grant or revoke every other area's access, so it can't
 * safely inherit a broader role list the way Content/Settings do.
 */
export const USER_MANAGEMENT_ROLES: Role[] = ["SUPER_ADMIN"];

export function canManageUsers(role: Role): boolean {
  return USER_MANAGEMENT_ROLES.includes(role);
}
