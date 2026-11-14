import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { STOCK_ADMIN_ROLES } from "@/lib/admin/roles";
import { getInventoryForExport, serializeInventoryRows } from "@/lib/admin/inventory-export";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: Request) {
  const auth = await requireApiRole(STOCK_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await getInventoryForExport();
  if (rows.length === 0) return apiError("No products to export.", 400);

  const buffer = await serializeInventoryRows(rows, format);
  const filename = `inventory-export-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
