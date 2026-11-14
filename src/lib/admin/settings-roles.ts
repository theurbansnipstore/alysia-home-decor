import type { Role } from "@prisma/client";

/** Store-wide config, highest blast radius — kept to the two highest-trust roles, same as Dashboard Overview. */
export const SETTINGS_AREA_ROLES: Role[] = ["SUPER_ADMIN", "ADMIN"];

export function canManageSettings(role: Role): boolean {
  return SETTINGS_AREA_ROLES.includes(role);
}
