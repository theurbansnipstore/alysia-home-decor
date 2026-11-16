// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getCustomerOrderById } from "@/lib/data/customer-orders";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return apiError("Authentication required.", 401);

  try {
    // getCustomerOrderById() returns null for both "doesn't exist" and
    // "exists but belongs to someone else" — never distinguish the two in
    // the response, same convention as getAddressById().
    const order = await getCustomerOrderById(session.id, params.id);
    if (!order) return apiError("Order not found", 404);
    return apiSuccess({ order });
  } catch (err) {
    console.error("[GET /api/account/orders/[id]]", err);
    return apiError("Failed to load order", 500);
  }
}
