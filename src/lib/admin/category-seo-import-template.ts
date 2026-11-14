import "server-only";
import ExcelJS from "exceljs";

/** Module 42 Part 1 — downloadable template for the SEO-only category
 *  import (category-seo-import.ts). Same "fictional example rows +
 *  Instructions sheet" shape as every other template generator in this
 *  project. */
const EXAMPLE_ROWS = [
  { slug: "rugs", seoTitle: "Handwoven Rugs Online | Elysia (fictional example)", seoDesc: "Shop natural-fibre and handwoven rugs, crafted for modern homes." },
  { slug: "lighting", seoTitle: "-", seoDesc: "A lone \"-\" clears an existing value; leave the cell blank to leave it unchanged." },
];

const INSTRUCTIONS: { heading: string; body: string }[] = [
  { heading: "Why only 3 columns", body: "Category Name, Slug, Description, Image, Parent, Sort Order, and Visibility have no admin write API in this application today — they are seed-managed. SEO Title and SEO Description are the only two category fields with an existing, authorized write path, so that is all this file can change." },
  { heading: "Matching key", body: "Slug — the same identifier shown in the storefront URL and in the Category export." },
  { heading: "Blank vs. clear", body: "Leave a cell blank to leave that field exactly as it is. Put a single hyphen \"-\" in the cell to deliberately CLEAR an existing value." },
  { heading: "Preview before applying", body: "Uploading only previews the changes — nothing is written until you review and confirm." },
];

export async function generateCategorySeoImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const sheet = wb.addWorksheet("Category SEO Import");
  sheet.columns = [
    { header: "Slug", key: "slug", width: 20 },
    { header: "SEO Title", key: "seoTitle", width: 40 },
    { header: "SEO Description", key: "seoDesc", width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };
  EXAMPLE_ROWS.forEach((r) => sheet.addRow(r));

  const instructions = wb.addWorksheet("Instructions");
  instructions.columns = [
    { header: "Topic", key: "heading", width: 28 },
    { header: "Details", key: "body", width: 100 },
  ];
  instructions.getRow(1).font = { bold: true };
  INSTRUCTIONS.forEach((row) => {
    const added = instructions.addRow(row);
    added.alignment = { wrapText: true, vertical: "top" };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
