// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getCustomerOrders } from "@/lib/data/customer-orders";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Authentication required.", 401);

  try {
    const orders = await getCustomerOrders(session.id);
    return apiSuccess({ orders });
  } catch (err) {
    console.error("[GET /api/account/orders]", err);
    return apiError("Failed to load orders", 500);
  }
}
