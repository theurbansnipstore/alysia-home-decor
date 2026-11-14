import type { Role } from "@prisma/client";

/** Overview aggregates cross-cutting store data (sales, all orders/products/customers) — kept to the two highest-trust roles. */
export const DASHBOARD_OVERVIEW_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export function canViewDashboardOverview(role: Role): boolean {
  return DASHBOARD_OVERVIEW_ROLES.includes(role);
}
