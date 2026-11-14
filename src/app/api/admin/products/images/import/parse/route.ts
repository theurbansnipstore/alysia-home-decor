import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { parseProductImageSpreadsheet, validateProductImageImportRows } from "@/lib/admin/product-image-import";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
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
    const rawRows = await parseProductImageSpreadsheet(buffer, file.name);

    if (rawRows.length === 0) return apiError("No data rows found in this file.", 400);
    if (rawRows.length > MAX_ROWS) {
      return apiError(`This file has ${rawRows.length} rows — imports are limited to ${MAX_ROWS} rows at a time.`, 400);
    }

    const results = await validateProductImageImportRows(rawRows);
    const summary = {
      create: results.filter((r) => r.action === "CREATE").length,
      update: results.filter((r) => r.action === "UPDATE").length,
      unchanged: results.filter((r) => r.action === "UNCHANGED").length,
      error: results.filter((r) => r.action === "ERROR").length,
    };

    return apiSuccess({ rawRows, results, summary });
  } catch (err) {
    console.error("[POST /api/admin/products/images/import/parse]", err);
    return apiError("Couldn't parse this file. Make sure it matches the exported template.", 500);
  }
}
