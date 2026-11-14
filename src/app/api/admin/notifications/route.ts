import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { NOTIFICATION_ADMIN_ROLES } from "@/lib/admin/notification-roles";
import { listAllNotifications } from "@/lib/services/notifications/service";

/** Cross-recipient oversight ("see every staff member's notifications") —
 *  a materially more sensitive capability than /api/notifications (always
 *  scoped to the caller's own rows), so it's role-gated separately and
 *  much more narrowly (SUPER_ADMIN/ADMIN only, not every staff role). */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(NOTIFICATION_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const type = searchParams.get("type") || undefined;

  try {
    const result = await listAllNotifications({ page, unreadOnly, type });
    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/admin/notifications]", err);
    return apiError("Failed to load notifications", 500);
  }
}
