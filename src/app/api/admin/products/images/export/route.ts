import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireApiRole } from "@/lib/admin/api-auth";
import { FULL_PRODUCT_ADMIN_ROLES } from "@/lib/admin/roles";
import { getProductImagesForExport, serializeProductImageRows } from "@/lib/admin/product-image-export";

const CONTENT_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(req: Request) {
  const auth = await requireApiRole(FULL_PRODUCT_ADMIN_ROLES);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await getProductImagesForExport();
  if (rows.length === 0) return apiError("No product images to export.", 400);

  const buffer = await serializeProductImageRows(rows, format);
  const filename = `product-images-export-${new Date().toISOString().slice(0, 10)}.${format}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
