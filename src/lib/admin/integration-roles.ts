import type { Role } from "@prisma/client";

/**
 * Same trust tier as Settings (src/lib/admin/settings-roles.ts) — this
 * dashboard doesn't display secret values, but it does reveal which
 * providers/credentials are configured and exposes live outbound test
 * actions (real Shiprocket auth calls, real Razorpay credential checks),
 * so it stays capped at the two highest-trust roles rather than the wider
 * ORDER_AREA_ROLES/SETTINGS_AREA_ROLES-adjacent sets.
 */
export const INTEGRATION_AREA_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export function canManageIntegrations(role: Role): boolean {
  return INTEGRATION_AREA_ROLES.includes(role);
}
