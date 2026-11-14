import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { sanitizeExcelRow } from "@/lib/admin/excel-security";

/**
 * Module 41 — read-only inventory snapshot for daily stock review. No
 * export API existed for inventory before this module (only import/apply
 * did) even though the module's required Inventory_Export_Template.xlsx
 * needs one. Deliberately mirrors product-export.ts's shape/columns
 * exactly (SKU as the primary key, plain read, no writes) rather than
 * introducing a second export pattern.
 */
export const INVENTORY_EXPORT_COLUMNS = [
  { key: "sku", header: "SKU" },
  { key: "name", header: "Product Name" },
  { key: "categorySlug", header: "Category" },
  { key: "currentStock", header: "Current Stock" },
  { key: "lowStockThreshold", header: "Low Stock Threshold" },
  { key: "stockStatus", header: "Stock Status" },
  { key: "status", header: "Product Status" },
] as const;

export type InventoryExportRow = Record<(typeof INVENTORY_EXPORT_COLUMNS)[number]["key"], string>;

export async function getInventoryForExport(): Promise<InventoryExportRow[]> {
  const products = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    include: { category: { select: { slug: true } } },
    orderBy: { sku: "asc" },
    take: 5000, // matches the same bulk-scale cap used by import/export/bulk-edit elsewhere in this codebase
  });

  return products.map((p) => {
    const stockStatus = p.stockAvailable <= 0 ? "OUT_OF_STOCK" : p.stockAvailable <= p.lowStockAt ? "LOW_STOCK" : "IN_STOCK";
    return sanitizeExcelRow({
      sku: p.sku,
      name: p.name,
      categorySlug: p.category.slug,
      currentStock: String(p.stockAvailable),
      lowStockThreshold: String(p.lowStockAt),
      stockStatus,
      status: p.status,
    });
  });
}

export async function serializeInventoryRows(rows: InventoryExportRow[], format: "csv" | "xlsx"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Inventory");
  sheet.columns = INVENTORY_EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 20 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  if (format === "xlsx") return Buffer.from(await wb.xlsx.writeBuffer());
  return Buffer.from(await wb.csv.writeBuffer());
}
