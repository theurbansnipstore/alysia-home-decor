// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { ORDER_AREA_ROLES } from "@/lib/admin/order-roles";
import { getAdminOrderList, type AdminOrderSortKey } from "@/lib/data/admin-orders";
import type { OrderStatus } from "@prisma/client";

const SORT_KEYS: AdminOrderSortKey[] = ["newest", "oldest", "total_asc", "total_desc"];
const STATUS_KEYS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
];

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(ORDER_AREA_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sortParam = searchParams.get("sort");
    const statusParam = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const result = await getAdminOrderList({
      q: searchParams.get("q") || undefined,
      status: STATUS_KEYS.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined,
      sort: SORT_KEYS.includes(sortParam as AdminOrderSortKey) ? (sortParam as AdminOrderSortKey) : undefined,
      page,
    });

    return apiSuccess(result);
  } catch (err) {
    console.error("[GET /api/admin/orders]", err);
    return apiError("Failed to load orders", 500);
  }
}
