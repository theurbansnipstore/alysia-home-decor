import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { sanitizeExcelRow } from "@/lib/admin/excel-security";

/**
 * Module 41 — read-only category snapshot. Category name/slug/parent/
 * sortOrder/visibility/image have NO admin write API anywhere in this
 * codebase today — they are seed-managed (see the existing comment in
 * src/app/admin/categories/page.tsx and src/lib/validations/category.ts).
 * Only seoTitle/seoDesc are admin-writable (categorySeoUpdateSchema). This
 * export is therefore a full read of every column for reference/reporting,
 * while the paired import (category-seo-import.ts) only ever writes the
 * two SEO fields — it does not invent a create/update/slug-redirect
 * capability that doesn't exist yet.
 */
export const CATEGORY_EXPORT_COLUMNS = [
  { key: "categoryId", header: "Category ID" },
  { key: "name", header: "Name" },
  { key: "slug", header: "Slug" },
  { key: "description", header: "Description" },
  { key: "image", header: "Image URL" },
  { key: "parentSlug", header: "Parent Category" },
  { key: "sortOrder", header: "Sort Order" },
  { key: "isVisible", header: "Visible" },
  { key: "seoTitle", header: "SEO Title" },
  { key: "seoDesc", header: "SEO Description" },
] as const;

export type CategoryExportRow = Record<(typeof CATEGORY_EXPORT_COLUMNS)[number]["key"], string>;

export async function getCategoriesForExport(): Promise<CategoryExportRow[]> {
  const categories = await prisma.category.findMany({
    include: { parent: { select: { slug: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return categories.map((c) =>
    sanitizeExcelRow({
      categoryId: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image: c.image ?? "",
      parentSlug: c.parent?.slug ?? "",
      sortOrder: String(c.sortOrder),
      isVisible: c.isVisible ? "YES" : "NO",
      seoTitle: c.seoTitle ?? "",
      seoDesc: c.seoDesc ?? "",
    })
  );
}

export async function serializeCategoryRows(rows: CategoryExportRow[], format: "csv" | "xlsx"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Categories");
  sheet.columns = CATEGORY_EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  if (format === "xlsx") return Buffer.from(await wb.xlsx.writeBuffer());
  return Buffer.from(await wb.csv.writeBuffer());
}
