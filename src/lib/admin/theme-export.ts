import "server-only";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { sanitizeExcelRow } from "@/lib/admin/excel-security";

/**
 * Module 41 — read-only theme snapshot. Theme has NO admin write API and
 * no admin page anywhere in this codebase — it is 100% seed-managed (unlike
 * Category, it doesn't even have SEO fields in the schema: Theme has no
 * seoTitle/seoDesc columns at all). This export is therefore read-only with
 * no paired import — building theme create/update is a genuinely new admin
 * feature (new API, new authorization surface, and for SEO fields a schema
 * change) that is out of this module's "Excel over existing architecture"
 * scope. Documented here and in docs/import-export/README.md rather than
 * silently building it.
 */
export const THEME_EXPORT_COLUMNS = [
  { key: "themeId", header: "Theme ID" },
  { key: "name", header: "Name" },
  { key: "slug", header: "Slug" },
  { key: "description", header: "Description" },
  { key: "banner", header: "Banner Image URL" },
  { key: "sortOrder", header: "Sort Order" },
  { key: "isEnabled", header: "Enabled" },
] as const;

export type ThemeExportRow = Record<(typeof THEME_EXPORT_COLUMNS)[number]["key"], string>;

export async function getThemesForExport(): Promise<ThemeExportRow[]> {
  const themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });

  return themes.map((t) =>
    sanitizeExcelRow({
      themeId: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description ?? "",
      banner: t.banner ?? "",
      sortOrder: String(t.sortOrder),
      isEnabled: t.isEnabled ? "YES" : "NO",
    })
  );
}

export async function serializeThemeRows(rows: ThemeExportRow[], format: "csv" | "xlsx"): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Themes");
  sheet.columns = THEME_EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => sheet.addRow(r));

  if (format === "xlsx") return Buffer.from(await wb.xlsx.writeBuffer());
  return Buffer.from(await wb.csv.writeBuffer());
}
