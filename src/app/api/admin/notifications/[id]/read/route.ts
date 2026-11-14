import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { NOTIFICATION_ADMIN_ROLES } from "@/lib/admin/notification-roles";
import { markAnyNotificationRead } from "@/lib/services/notifications/service";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(NOTIFICATION_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    await markAnyNotificationRead(params.id);
    return apiSuccess({ ok: true });
  } catch (err) {
    console.error("[POST /api/admin/notifications/[id]/read]", err);
    return apiError("Failed to mark notification as read", 500);
  }
}
