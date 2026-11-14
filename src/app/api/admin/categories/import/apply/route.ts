import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { applyCategorySeoImportRows } from "@/lib/admin/category-seo-import";

const applySchema = z.object({
  rawRows: z.array(z.record(z.string())).min(1).max(5000),
});

/** Re-validates from the original raw rows rather than trusting the
 *  client's earlier /parse preview — same discipline as the product import
 *  apply route. */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(MARKETING_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid import payload.", 400, parsed.error.flatten().fieldErrors);
    }

    const outcome = await applyCategorySeoImportRows(parsed.data.rawRows, auth.session.id);
    return apiSuccess(outcome);
  } catch (err) {
    console.error("[POST /api/admin/categories/import/apply]", err);
    return apiError("Failed to apply category SEO import.", 500);
  }
}
