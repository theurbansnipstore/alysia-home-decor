import "server-only";
import ExcelJS from "exceljs";
import { STOCK_ADJUSTMENT_REASONS } from "@/lib/inventory/stock-service";

/**
 * Module 42 Part 1 — Inventory had no downloadable template route (only
 * Product import has one, since Module 34). Mirrors
 * product-import-template.ts's shape exactly: fictional example rows +
 * an Instructions sheet, nothing written to the database (pure file
 * generation, no Prisma access at all).
 */
const EXAMPLE_ROWS = [
  { sku: "DEMO-0001", quantity: "+10", reason: "purchase", notes: "New supplier shipment (fictional — do not import as-is)" },
  { sku: "DEMO-0002", quantity: "-2", reason: "damage", notes: "Damaged in transit (fictional — do not import as-is)" },
];

const INSTRUCTIONS: { heading: string; body: string }[] = [
  { heading: "This is not a stock overwrite", body: "Each row is applied as a signed ADJUSTMENT (e.g. +10 or -2) through the same stock-adjustment service the single-product Stock panel uses — every change is recorded with a reason, and stock can never be pushed below zero." },
  { heading: "SKU", body: "Must match an existing product's SKU exactly. Unknown SKUs fail that row with a clear error — no product is created by this file." },
  { heading: "Quantity", body: "The column header must be exactly \"Quantity\". A whole number, signed: +10 increases stock by 10, -2 decreases by 2. Zero is rejected." },
  { heading: "Reason", body: `Must be one of: ${STOCK_ADJUSTMENT_REASONS.join(", ")} (case-insensitive).` },
  { heading: "Multiple rows, same SKU", body: "Rows are applied in file order — a later row sees the earlier row's already-applied change when checking for a negative-stock result." },
  { heading: "Preview before applying", body: "Uploading only previews the changes — nothing is written to the database until you review and confirm." },
];

export async function generateInventoryImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const sheet = wb.addWorksheet("Inventory Import Template");
  sheet.columns = [
    { header: "SKU", key: "sku", width: 20 },
    { header: "Quantity", key: "quantity", width: 14 },
    { header: "Reason", key: "reason", width: 16 },
    { header: "Notes", key: "notes", width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };
  EXAMPLE_ROWS.forEach((r) => sheet.addRow(r));
  for (let r = 2; r <= 500; r++) {
    sheet.getCell(`C${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${STOCK_ADJUSTMENT_REASONS.join(",")}"`] };
  }

  const instructions = wb.addWorksheet("Instructions");
  instructions.columns = [
    { header: "Topic", key: "heading", width: 32 },
    { header: "Details", key: "body", width: 100 },
  ];
  instructions.getRow(1).font = { bold: true };
  INSTRUCTIONS.forEach((row) => {
    const added = instructions.addRow(row);
    added.alignment = { wrapText: true, vertical: "top" };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
