import type { Role } from "@prisma/client";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

/** Who receives an admin "new order" notification — reuses the existing
 *  order-management role group unchanged (no new role, no widened access). */
export const NEW_ORDER_NOTIFICATION_ROLES: Role[] = ORDER_AREA_ROLES;

/** Who receives an admin low-stock/out-of-stock notification — reuses the
 *  existing inventory role group unchanged. */
export const LOW_STOCK_NOTIFICATION_ROLES: Role[] = STOCK_ADMIN_ROLES;

/**
 * /admin/notifications is a cross-recipient oversight view ("see every
 * staff member's notifications", not just your own) — a materially more
 * sensitive capability than the header bell (which is always scoped to the
 * viewing session's own notifications, for every role including CUSTOMER).
 * Reuses SETTINGS_AREA_ROLES exactly rather than introducing a new same-
 * valued array, per "reuse existing role permissions."
 */
export const NOTIFICATION_ADMIN_ROLES: Role[] = SETTINGS_AREA_ROLES;
