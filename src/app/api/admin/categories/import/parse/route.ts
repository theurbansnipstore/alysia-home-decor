import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { MARKETING_ADMIN_ROLES } from "@/lib/admin/roles";
import { parseCategorySeoSpreadsheet, validateCategorySeoImportRows } from "@/lib/admin/category-seo-import";

const MAX_ROWS = 5000;

/** Upload + parse + validate only — mirrors product import's preview-then-
 *  confirm shape exactly. Nothing is written to the database here. */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(MARKETING_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("No file provided.", 400);
  if (!/\.(csv|xlsx)$/i.test(file.name)) return apiError("Only .csv or .xlsx files are supported.", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = await parseCategorySeoSpreadsheet(buffer, file.name);

    if (rawRows.length === 0) return apiError("No data rows found in this file.", 400);
    if (rawRows.length > MAX_ROWS) {
      return apiError(`This file has ${rawRows.length} rows — imports are limited to ${MAX_ROWS} rows at a time.`, 400);
    }

    const results = await validateCategorySeoImportRows(rawRows);
    const summary = {
      update: results.filter((r) => r.ok && r.changed).length,
      unchanged: results.filter((r) => r.ok && !r.changed).length,
      error: results.filter((r) => !r.ok).length,
    };

    return apiSuccess({ rawRows, results, summary });
  } catch (err) {
    console.error("[POST /api/admin/categories/import/parse]", err);
    return apiError("Couldn't parse this file. Make sure it matches the exported template.", 500);
  }
}
