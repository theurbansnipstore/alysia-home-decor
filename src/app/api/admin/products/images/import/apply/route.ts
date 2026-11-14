import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { applyProductImageImportRows } from "@/lib/admin/product-image-import";

const applySchema = z.object({
  rawRows: z.array(z.record(z.string())).min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid import payload.", 400, parsed.error.flatten().fieldErrors);
    }

    const outcome = await applyProductImageImportRows(parsed.data.rawRows, auth.session.id);
    return apiSuccess(outcome);
  } catch (err) {
    console.error("[POST /api/admin/products/images/import/apply]", err);
    return apiError("Failed to apply product image import.", 500);
  }
}
