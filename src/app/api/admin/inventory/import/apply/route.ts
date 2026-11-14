import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { applyInventoryImportRows } from "@/lib/admin/inventory-import";
import { inventoryImportRawRowsSchema } from "@/lib/validations/inventory-import";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = inventoryImportRawRowsSchema.safeParse(body?.rawRows);
    if (!parsed.success) {
      return apiError("Invalid import data.", 400);
    }

    const outcome = await applyInventoryImportRows(parsed.data, auth.session.name);
    return apiSuccess(outcome);
  } catch (err) {
    console.error("[POST /api/admin/inventory/import/apply]", err);
    return apiError("Failed to apply inventory import.", 500);
  }
}
