import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { logActivity } from "@/lib/admin/activity-log";

/**
 * Archive is a status flip, never a delete — Product rows are never
 * physically removed by this admin area.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
    if (!product) return apiError("Product not found", 404);

    const body = await req.json().catch(() => ({}));
    const restore = body?.action === "restore";
    const newStatus = restore ? "DRAFT" : "ARCHIVED";

    // Idempotency: repeating the same archive/restore call never writes a
    // second misleading audit entry claiming a state change that didn't
    // happen (mirrors the same guard status-service.ts uses for orders).
    const alreadyInStatus = product.status === newStatus;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.product.update({ where: { id: params.id }, data: { status: newStatus } });

      if (!alreadyInStatus) {
        await logActivity(tx, {
          userId: auth.session.id,
          action: restore ? "product.restored" : "product.archived",
          entity: "Product",
          entityId: result.id,
          metadata: { action: restore ? "RESTORE" : "ARCHIVE", previousStatus: product.status, newStatus: result.status },
        });
      }

      return result;
    });

    return apiSuccess({ id: updated.id, status: updated.status });
  } catch (err) {
    console.error("[POST /api/admin/products/[id]/archive]", err);
    return apiError("Failed to update product status", 500);
  }
}
