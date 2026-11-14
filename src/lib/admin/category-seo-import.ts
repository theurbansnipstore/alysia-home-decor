import "server-only";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { categorySeoUpdateSchema } from "@/lib/validations/category";
import { logActivity, type CategorySeoImportMetadata } from "@/lib/admin/activity-log";

/**
 * Module 41 — bulk category SEO import. Deliberately narrow: matches rows
 * by Slug (the stable, human-typeable identifier — same choice product
 * import makes for category/theme references) and writes ONLY seoTitle/
 * seoDesc through the exact same categorySeoUpdateSchema the single-category
 * SEO screen already uses (/api/admin/categories/[id]/seo). Every other
 * category column (name, description, image, parent, sortOrder, isVisible)
 * is read-only in this file's export and rejected here if present with a
 * non-blank value that would change it — there is no existing admin write
 * path for those fields to reuse, and inventing one is out of scope (see
 * category-export.ts's header comment).
 */
export async function parseCategorySeoSpreadsheet(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  if (filename.toLowerCase().endsWith(".xlsx")) {
    await wb.xlsx.load(buffer);
  } else {
    await wb.csv.read(Readable.from(buffer));
  }

  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headerCells[colNumber] = String(cell.value ?? "").trim().toLowerCase();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headerCells[colNumber];
      if (!key) return;
      const v = cell.value;
      obj[key] = v === null || v === undefined ? "" : String(v).trim();
    });
    if (Object.values(obj).some((v) => v !== "")) rows.push(obj);
  });

  return rows;
}

export interface CategorySeoImportRowResult {
  rowNumber: number;
  slug: string;
  ok: boolean;
  errors: string[];
  categoryId?: string;
  changed: boolean;
  seoTitle?: string | null;
  seoDesc?: string | null;
}

export async function validateCategorySeoImportRows(rawRows: Record<string, string>[]): Promise<CategorySeoImportRowResult[]> {
  const slugsInFile = rawRows.map((r) => (r.slug || "").trim()).filter(Boolean);
  const categories = await prisma.category.findMany({ where: { slug: { in: slugsInFile } } });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const seen = new Set<string>();

  return rawRows.map((row, idx) => {
    const rowNumber = idx + 2;
    const slug = (row.slug || "").trim();
    const errors: string[] = [];

    if (!slug) errors.push("Slug is required.");
    if (slug && seen.has(slug)) errors.push(`Duplicate slug within this file: ${slug}`);
    if (slug) seen.add(slug);

    const category = slug ? bySlug.get(slug) : undefined;
    if (slug && !category) errors.push(`No category with slug "${slug}".`);

    // "Leave blank to keep unchanged" for both fields — an explicit
    // clear-the-value action is represented by the literal token "-"
    // (same convention this module's inventory template documents for
    // "no change"), never by a blank cell, so an admin can't accidentally
    // wipe existing SEO text just by leaving a column empty.
    const seoTitleRaw = row.seotitle ?? row["seo title"];
    const seoDescRaw = row.seodesc ?? row["seo description"];
    const seoTitle = seoTitleRaw === "-" ? null : seoTitleRaw && seoTitleRaw.trim() ? seoTitleRaw.trim() : undefined;
    const seoDesc = seoDescRaw === "-" ? null : seoDescRaw && seoDescRaw.trim() ? seoDescRaw.trim() : undefined;

    const parsed = categorySeoUpdateSchema.safeParse({
      ...(seoTitle !== undefined ? { seoTitle } : {}),
      ...(seoDesc !== undefined ? { seoDesc } : {}),
    });
    if (!parsed.success) {
      for (const issues of Object.values(parsed.error.flatten().fieldErrors)) {
        if (issues) errors.push(...issues);
      }
    }

    if (errors.length > 0) {
      return { rowNumber, slug, ok: false, errors, changed: false };
    }

    const changed =
      (seoTitle !== undefined && seoTitle !== (category!.seoTitle ?? null)) ||
      (seoDesc !== undefined && seoDesc !== (category!.seoDesc ?? null));

    return {
      rowNumber,
      slug,
      ok: true,
      errors: [],
      categoryId: category!.id,
      changed,
      seoTitle,
      seoDesc,
    };
  });
}

export interface CategorySeoImportOutcome {
  updated: number;
  unchanged: number;
  failed: number;
  errors: { rowNumber: number; slug: string; errors: string[] }[];
}

export async function applyCategorySeoImportRows(
  rawRows: Record<string, string>[],
  actorUserId: string
): Promise<CategorySeoImportOutcome> {
  const rows = await validateCategorySeoImportRows(rawRows);
  const outcome: CategorySeoImportOutcome = { updated: 0, unchanged: 0, failed: 0, errors: [] };

  for (const row of rows) {
    if (!row.ok) {
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, slug: row.slug, errors: row.errors });
      continue;
    }
    if (!row.changed) {
      outcome.unchanged++;
      continue;
    }

    try {
      const data: { seoTitle?: string | null; seoDesc?: string | null } = {};
      if (row.seoTitle !== undefined) data.seoTitle = row.seoTitle;
      if (row.seoDesc !== undefined) data.seoDesc = row.seoDesc;
      await prisma.category.update({ where: { id: row.categoryId! }, data });
      outcome.updated++;
    } catch (err) {
      console.error("[applyCategorySeoImportRows] row failed", row.rowNumber, err);
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, slug: row.slug, errors: ["Write failed — see server logs."] });
    }
  }

  if (outcome.updated > 0) {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "category.seo_imported",
      entity: "Category",
      metadata: { operation: "IMPORT", updated: outcome.updated, unchanged: outcome.unchanged, failed: outcome.failed } satisfies CategorySeoImportMetadata,
    });
  }

  return outcome;
}
