import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { WELL_KNOWN_ATTRIBUTE_LABELS } from "@/lib/admin/product-attributes";
import { sanitizeExcelRow } from "@/lib/admin/excel-security";

export const EXPORT_COLUMNS = [
  { key: "productId", header: "Product ID" },
  { key: "sku", header: "SKU" },
  { key: "name", header: "Product Name" },
  { key: "slug", header: "Slug" },
  { key: "description", header: "Description" },
  { key: "price", header: "Price" },
  { key: "compareAtPrice", header: "Compare At Price" },
  { key: "stock", header: "Stock" },
  { key: "lowStockThreshold", header: "Low Stock Threshold" },
  { key: "status", header: "Status" },
  { key: "categorySlug", header: "Category" },
  { key: "themeSlug", header: "Theme" },
  { key: "material", header: "Material" },
  { key: "color", header: "Color" },
  { key: "width", header: "Width" },
  { key: "height", header: "Height" },
  { key: "careInstructions", header: "Care Instructions" },
  { key: "newArrival", header: "New Arrival" },
  { key: "bestSeller", header: "Best Seller" },
  { key: "trending", header: "Trending" },
  { key: "featured", header: "Featured" },
] as const;

export type ExportRow = Record<(typeof EXPORT_COLUMNS)[number]["key"], string>;

/**
 * Category/Theme are exported by slug, not internal cuid — slugs are the
 * stable, human-typeable identifier an admin can actually read/edit in a
 * spreadsheet and are what import matches against (see product-import.ts).
 * Product ID is included too, for reference/audit only — SKU remains the
 * primary import matching key per the prompt's explicit instruction.
 */
export async function getProductsForExport(productIds: string[]): Promise<ExportRow[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true, theme: true, attributes: true },
    orderBy: { createdAt: "asc" },
  });

  return products.map((p) => {
    const attr = (label: string) => p.attributes.find((a) => a.label === label)?.value ?? "";
    return sanitizeExcelRow({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price.toString(),
      compareAtPrice: p.discountPrice ? p.discountPrice.toString() : "",
      stock: String(p.stockAvailable),
      lowStockThreshold: String(p.lowStockAt),
      status: p.status,
      categorySlug: p.category.slug,
      themeSlug: p.theme?.slug ?? "",
      material: attr(WELL_KNOWN_ATTRIBUTE_LABELS[0]),
      color: attr(WELL_KNOWN_ATTRIBUTE_LABELS[1]),
      width: attr(WELL_KNOWN_ATTRIBUTE_LABELS[2]),
      height: attr(WELL_KNOWN_ATTRIBUTE_LABELS[3]),
      careInstructions: attr(WELL_KNOWN_ATTRIBUTE_LABELS[4]),
      newArrival: p.isNewArrival ? "YES" : "NO",
      bestSeller: p.isBestSeller ? "YES" : "NO",
      trending: p.isTrending ? "YES" : "NO",
      featured: p.isFeatured ? "YES" : "NO",
    });
  });
}

export async function serializeProductRows(rows: ExportRow[], format: "csv" | "xlsx"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Products");
  sheet.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key }));
  rows.forEach((r) => sheet.addRow(r));

  if (format === "xlsx") {
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
  return Buffer.from(await wb.csv.writeBuffer());
}
