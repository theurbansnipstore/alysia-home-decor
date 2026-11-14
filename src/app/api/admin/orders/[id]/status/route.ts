import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ORDER_FULL_ACCESS_ROLES } from "@/lib/admin/order-roles";
import { updateOrderStatusSchema } from "@/lib/validations/order";
import { updateOrderStatus } from "@/lib/orders/status-service";

/**
 * SUPPORT_STAFF is deliberately excluded here (read-only per Decision 2) —
 * only ORDER_FULL_ACCESS_ROLES, not the broader ORDER_AREA_ROLES the GET
 * routes use.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ORDER_FULL_ACCESS_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = updateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid status update", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await updateOrderStatus({
      orderId: params.id,
      status: parsed.data.status,
      trackingNumber: parsed.data.trackingNumber,
      courierName: parsed.data.courierName,
      statusReason: parsed.data.statusReason,
      actorUserId: auth.session.id,
    });

    if (!result.success) {
      return apiError(result.error || "Failed to update order status", 400);
    }

    return apiSuccess({ order: result.order, alreadyInStatus: result.alreadyInStatus });
  } catch (err) {
    console.error("[PATCH /api/admin/orders/[id]/status]", err);
    return apiError("Failed to update order status", 500);
  }
}
