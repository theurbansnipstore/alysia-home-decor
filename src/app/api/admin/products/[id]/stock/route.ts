import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { stockAdjustmentSchema } from "@/lib/validations/product";
import { adjustStock, getStockMovementHistory } from "@/lib/inventory/stock-service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const history = await getStockMovementHistory(params.id);
    return apiSuccess(history);
  } catch (err) {
    console.error("[GET /api/admin/products/[id]/stock]", err);
    return apiError("Failed to load stock history", 500);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!existing) return apiError("Product not found", 404);

    const body = await req.json();
    const parsed = stockAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid stock adjustment", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await adjustStock({ productId: params.id, ...parsed.data, adjustedByName: auth.session.name });
    if (!result.success) {
      return apiError(result.error || "Stock adjustment failed", 400);
    }

    return apiSuccess({ stockAvailable: result.stockAvailable, movement: result.movement });
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/stock]", err);
    return apiError("Failed to adjust stock", 500);
  }
}
