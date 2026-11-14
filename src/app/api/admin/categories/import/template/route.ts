import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { generateCategorySeoImportTemplate } from "@/lib/admin/category-seo-import-template";

/** Pure file generation — no database reads or writes. */
export async function GET() {
  const auth = await requireApiRole(MARKETING_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const buffer = await generateCategorySeoImportTemplate();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Category SEO Import Template.xlsx"',
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/categories/import/template]", err);
    return apiError("Failed to generate template.", 500);
  }
}
