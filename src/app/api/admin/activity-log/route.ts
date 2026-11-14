import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ACTIVITY_LOG_ADMIN_ROLES } from "@/lib/admin/activity-log-roles";
import { listAdminActivityLog } from "@/lib/data/admin-activity-log";

/** Cross-cutting audit oversight — same role tier as /api/admin/notifications, not the narrower per-area roles (order/customer managers see their own area's detail pages, not the full cross-entity trail). */
export async function GET(req: NextRequest) {
  const auth = await requireApiRole(ACTIVITY_LOG_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const action = searchParams.get("action") || undefined;
  const entity = searchParams.get("entity") || undefined;

  try {
    const result = await listAdminActivityLog({ page, action, entity });
    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/admin/activity-log]", err);
    return apiError("Failed to load activity log", 500);
  }
}
