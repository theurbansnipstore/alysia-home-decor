import type { Role } from "@prisma/client";

/** SUPPORT_STAFF included — already customer-facing for order support (order-roles.ts), same rationale applies here. */
export const CUSTOMER_AREA_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "SUPPORT_STAFF"];

/** Overriding a COD restriction is a business-risk decision, not routine
 *  support work — narrower than CUSTOMER_AREA_ROLES, same read-vs-write
 *  split precedent as ORDER_FULL_ACCESS_ROLES excluding SUPPORT_STAFF. */
export const CUSTOMER_RISK_MANAGEMENT_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export function canViewCustomers(role: Role): boolean {
  return CUSTOMER_AREA_ROLES.includes(role);
}

export function canManageCodRisk(role: Role): boolean {
  return CUSTOMER_RISK_MANAGEMENT_ROLES.includes(role);
}
