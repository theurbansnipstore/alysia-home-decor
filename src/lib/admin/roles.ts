import type { Role } from "@prisma/client";

export const FULL_PRODUCT_ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];
export const STOCK_ADMIN_ROLES: Role[] = [...FULL_PRODUCT_ADMIN_ROLES, "INVENTORY_STAFF"];
export const MARKETING_ADMIN_ROLES: Role[] = [...FULL_PRODUCT_ADMIN_ROLES, "MARKETING_STAFF"];

/** Anyone allowed into /admin/products at all — union of every product-admin role. */
export const PRODUCT_AREA_ROLES: Role[] = [...FULL_PRODUCT_ADMIN_ROLES, "INVENTORY_STAFF", "MARKETING_STAFF"];

export function canManageProducts(role: Role): boolean {
  return FULL_PRODUCT_ADMIN_ROLES.includes(role);
}

export function canAdjustStock(role: Role): boolean {
  return STOCK_ADMIN_ROLES.includes(role);
}

export function canManageMarketing(role: Role): boolean {
  return MARKETING_ADMIN_ROLES.includes(role);
}
