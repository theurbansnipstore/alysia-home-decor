import type { Role } from "@prisma/client";

/**
 * Separate from src/lib/admin/roles.ts (Module 10, product-scoped) by
 * design — order management is a distinct permission domain. MANAGER is
 * deliberately NOT included here: Module 10 scoped it to products
 * specifically, and Module 12's approved decisions only name
 * SUPER_ADMIN/ADMIN/ORDER_MANAGER for full order access.
 */
export const ORDER_FULL_ACCESS_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER"];
export const ORDER_READ_ONLY_ROLES: Role[] = ["SUPPORT_STAFF"];

/** Anyone allowed into /admin/orders at all — full-access + read-only. */
export const ORDER_AREA_ROLES: Role[] = [...ORDER_FULL_ACCESS_ROLES, ...ORDER_READ_ONLY_ROLES];

export function canManageOrders(role: Role): boolean {
  return ORDER_FULL_ACCESS_ROLES.includes(role);
}

export function canViewOrders(role: Role): boolean {
  return ORDER_AREA_ROLES.includes(role);
}
