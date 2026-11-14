import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { bulkEditRequestSchema } from "@/lib/validations/bulk-product";
import { applyBulkEdit } from "@/lib/admin/bulk-product-service";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = bulkEditRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid bulk edit request.", 400, parsed.error.flatten().fieldErrors);
    }

    const result = await applyBulkEdit(parsed.data.selection, parsed.data.changes, auth.session.id);
    return apiSuccess(result);
  } catch (err) {
    console.error("[POST /api/admin/products/bulk/apply]", err);
    return apiError("Failed to apply bulk edit.", 500);
  }
}
