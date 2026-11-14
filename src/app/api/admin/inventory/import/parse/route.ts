import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { parseInventorySpreadsheet, validateInventoryImportRows } from "@/lib/admin/inventory-import";

const MAX_ROWS = 5000;

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("No file provided.", 400);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = await parseInventorySpreadsheet(buffer, file.name);
    if (rawRows.length === 0) return apiError("No data rows found in this file.", 400);
    if (rawRows.length > MAX_ROWS) return apiError(`This file has ${rawRows.length} rows — inventory import is limited to ${MAX_ROWS} at a time.`, 400);

    const results = await validateInventoryImportRows(rawRows);
    const summary = {
      valid: results.filter((r) => r.ok).length,
      error: results.filter((r) => !r.ok).length,
    };

    return apiSuccess({ rawRows, results, summary });
  } catch (err) {
    console.error("[POST /api/admin/inventory/import/parse]", err);
    return apiError("Couldn't parse this file. Make sure it's a valid CSV or XLSX.", 400);
  }
}
