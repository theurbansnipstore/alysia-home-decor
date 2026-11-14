import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { getAdminOrderById } from "@/lib/data/admin-orders";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ORDER_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const order = await getAdminOrderById(params.id);
    if (!order) return apiError("Order not found", 404);
    return apiSuccess({ order });
  } catch (err) {
    console.error("[GET /api/admin/orders/[id]]", err);
    return apiError("Failed to load order", 500);
  }
}
