// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { generateProductImportTemplate } from "@/lib/admin/product-import-template";

/** Pure file generation — no database reads or writes, so the example rows
 *  in the template can never leak into real product data. */
export async function GET() {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const buffer = await generateProductImportTemplate();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Product Import Template.xlsx"',
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/products/import/template]", err);
    return apiError("Failed to generate template.", 500);
  }
}
