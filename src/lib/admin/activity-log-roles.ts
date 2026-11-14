import type { Role } from "@prisma/client";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

/**
 * A cross-cutting audit trail (order status changes, COD restrictions, and
 * whatever else logs here in the future) — the same "highest-trust, not
 * just the area's own managers" precedent as NOTIFICATION_ADMIN_ROLES,
 * reusing SETTINGS_AREA_ROLES exactly rather than a new same-valued array.
 */
export const ACTIVITY_LOG_ADMIN_ROLES: Role[] = SETTINGS_AREA_ROLES;
