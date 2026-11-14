import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { sanitizeExcelRow } from "@/lib/admin/excel-security";

/**
 * Module 41 — read-only export of every ProductImage row, matched by SKU +
 * Image URL (the paired import's own matching key — see
 * product-image-import.ts). ProductImage has no "primary" flag or
 * visibility flag in the schema: sortOrder 0 is the existing convention
 * used across the storefront for "the main image" (see resolveProductImageSet
 * in src/lib/products/image-helpers.ts), and every image is always shown —
 * there is no per-image enabled/disabled toggle to export. Documented here
 * rather than inventing either column.
 */
export const PRODUCT_IMAGE_EXPORT_COLUMNS = [
  { key: "sku", header: "SKU" },
  { key: "productName", header: "Product Name" },
  { key: "imageUrl", header: "Image URL" },
  { key: "altText", header: "Alt Text" },
  { key: "sortOrder", header: "Sort Order" },
  { key: "isPrimary", header: "Primary Image (sortOrder=0)" },
  { key: "purpose", header: "Purpose" },
] as const;

export type ProductImageExportRow = Record<(typeof PRODUCT_IMAGE_EXPORT_COLUMNS)[number]["key"], string>;

export async function getProductImagesForExport(): Promise<ProductImageExportRow[]> {
  const images = await prisma.productImage.findMany({
    include: { product: { select: { sku: true, name: true } } },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
    take: 20000,
  });

  return images.map((img) =>
    sanitizeExcelRow({
      sku: img.product.sku,
      productName: img.product.name,
      imageUrl: img.url,
      altText: img.altText ?? "",
      sortOrder: String(img.sortOrder),
      isPrimary: img.sortOrder === 0 ? "YES" : "NO",
      purpose: img.purpose,
    })
  );
}

export async function serializeProductImageRows(rows: ProductImageExportRow[], format: "csv" | "xlsx"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Product Images");
  sheet.columns = PRODUCT_IMAGE_EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  if (format === "xlsx") return Buffer.from(await wb.xlsx.writeBuffer());
  return Buffer.from(await wb.csv.writeBuffer());
}
