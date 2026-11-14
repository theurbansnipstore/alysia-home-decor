import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ORDER_FULL_ACCESS_ROLES } from "@/lib/admin/order-roles";
import { createShipmentForOrder } from "@/lib/integrations/shipping/shipment-service";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Service-layer readiness for "create shipment" (Module 23) — backed only
 * by MockShipmentProvider today (no real Shiprocket account). Deliberately
 * NOT wired to an admin UI button this module: Part 21's "only add buttons
 * for operations that are actually implemented" cuts against presenting a
 * mock-backed action as if it were a real courier integration. This route
 * exists so the architecture is exercisable (via simulate-shipment.ts) and
 * ready to attach a real "Create Shipment" button to once a real provider
 * exists, without needing route/service changes at that point.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ORDER_FULL_ACCESS_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const result = await createShipmentForOrder(params.id, auth.session.id);
    if (!result.success) {
      return apiError(result.error || "Could not create shipment.", 400);
    }
    return apiSuccess({ trackingNumber: result.trackingNumber, courierName: result.courierName });
  } catch (err) {
    console.error("[POST /api/admin/orders/[id]/shipment]", err);
    return apiError("Could not create shipment.", 500);
  }
}
