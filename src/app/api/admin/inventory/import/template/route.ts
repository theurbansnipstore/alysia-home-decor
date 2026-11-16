// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { generateInventoryImportTemplate } from "@/lib/admin/inventory-import-template";

/** Pure file generation — no database reads or writes. */
export async function GET() {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const buffer = await generateInventoryImportTemplate();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Inventory Import Template.xlsx"',
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/inventory/import/template]", err);
    return apiError("Failed to generate template.", 500);
  }
}
