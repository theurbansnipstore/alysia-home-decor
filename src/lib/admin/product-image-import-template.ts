import "server-only";
import ExcelJS from "exceljs";

/** Module 42 Part 1 — downloadable template for the URL-based product
 *  image import (product-image-import.ts). Same shape as every other
 *  template generator in this project. */
const EXAMPLE_ROWS = [
  { sku: "DEMO-0001", imageUrl: "https://example.com/demo-0001-a.jpg", altText: "Jute rug, top view", sortOrder: "0", purpose: "PRODUCT" },
  { sku: "DEMO-0001", imageUrl: "https://example.com/demo-0001-b.jpg", altText: "Jute rug, styled in a living room", sortOrder: "1", purpose: "LIFESTYLE" },
];

const INSTRUCTIONS: { heading: string; body: string }[] = [
  { heading: "Images are by URL, not file upload", body: "This file references images already hosted somewhere reachable by URL — it does not carry binary image data. To upload new binary image FILES instead, use Products > Bulk Images (filename convention SKU-position.jpg), which is unrelated to this file." },
  { heading: "How matching works", body: "Each row is matched by (SKU, Image URL) together. A URL your product doesn't have yet CREATES a new image. A URL it already has UPDATES only that image's Alt Text / Sort Order / Purpose." },
  { heading: "Primary image", body: "There is no separate \"is primary\" flag — Sort Order 0 is the convention for \"the main image\" used across the storefront." },
  { heading: "Purpose", body: "PRODUCT, LIFESTYLE, or DETAIL. Leave blank on a new row to default to PRODUCT; leave blank on an existing row to leave it unchanged." },
  { heading: "Preview before applying", body: "Uploading only previews the changes — nothing is written until you review and confirm." },
];

export async function generateProductImageImportTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const sheet = wb.addWorksheet("Product Image Import");
  sheet.columns = [
    { header: "SKU", key: "sku", width: 20 },
    { header: "Image URL", key: "imageUrl", width: 45 },
    { header: "Alt Text", key: "altText", width: 30 },
    { header: "Sort Order", key: "sortOrder", width: 12 },
    { header: "Purpose", key: "purpose", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  EXAMPLE_ROWS.forEach((r) => sheet.addRow(r));
  for (let r = 2; r <= 2000; r++) {
    sheet.getCell(`E${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"PRODUCT,LIFESTYLE,DETAIL"'] };
  }

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
