import "server-only";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { imageCreateSchema, imageUpdateSchema } from "@/lib/validations/product";
import { logActivity, type ProductImageImportMetadata } from "@/lib/admin/activity-log";

/**
 * Module 41 — bulk product-image import via URL (not binary upload — the
 * existing binary path is the filename-convention bulk uploader at
 * /api/admin/products/images/bulk-upload, unchanged by this module). Matches
 * rows by (SKU, Image URL): an unseen URL for that product CREATEs a new
 * ProductImage (reusing imageCreateSchema, the exact schema the single-image
 * "add image by URL" route already uses); a URL that already exists for that
 * product UPDATEs only altText/sortOrder/purpose (reusing imageUpdateSchema,
 * the exact schema the single-image PATCH route already uses). No new
 * validation rules are invented — this is a bulk front end for the same two
 * existing, already-authorized write paths.
 */
export async function parseProductImageSpreadsheet(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
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

export type ProductImageImportAction = "CREATE" | "UPDATE" | "UNCHANGED" | "ERROR";

export interface ProductImageImportRowResult {
  rowNumber: number;
  sku: string;
  imageUrl: string;
  action: ProductImageImportAction;
  errors: string[];
  productId?: string;
  existingImageId?: string;
  altText?: string | null;
  sortOrder?: number;
  purpose?: "PRODUCT" | "LIFESTYLE" | "DETAIL";
}

export async function validateProductImageImportRows(rawRows: Record<string, string>[]): Promise<ProductImageImportRowResult[]> {
  const skusInFile = Array.from(new Set(rawRows.map((r) => (r.sku || "").trim()).filter(Boolean)));
  const products = await prisma.product.findMany({
    where: { sku: { in: skusInFile } },
    select: { id: true, sku: true, images: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const seen = new Set<string>();

  return rawRows.map((row, idx) => {
    const rowNumber = idx + 2;
    const sku = (row.sku || "").trim();
    const imageUrl = (row.imageurl || row["image url"] || "").trim();
    const errors: string[] = [];

    if (!sku) errors.push("SKU is required.");
    if (!imageUrl) errors.push("Image URL is required.");

    const dedupeKey = `${sku}::${imageUrl}`;
    if (sku && imageUrl && seen.has(dedupeKey)) errors.push(`Duplicate SKU+Image URL within this file: ${sku} / ${imageUrl}`);
    if (sku && imageUrl) seen.add(dedupeKey);

    const product = sku ? bySku.get(sku) : undefined;
    if (sku && !product) errors.push(`No product with SKU "${sku}".`);

    const existingImage = product?.images.find((img) => img.url === imageUrl);

    const altTextRaw = row.alttext ?? row["alt text"];
    const sortOrderRaw = row.sortorder ?? row["sort order"];
    const purposeRaw = (row.purpose || "").trim().toUpperCase();

    let sortOrder: number | undefined;
    if (sortOrderRaw && sortOrderRaw.trim()) {
      const n = parseInt(sortOrderRaw.trim(), 10);
      if (Number.isNaN(n) || n < 0) errors.push(`Invalid sort order: "${sortOrderRaw}".`);
      else sortOrder = n;
    }

    let purpose: "PRODUCT" | "LIFESTYLE" | "DETAIL" | undefined;
    if (purposeRaw) {
      if (!["PRODUCT", "LIFESTYLE", "DETAIL"].includes(purposeRaw)) errors.push(`Invalid purpose: "${row.purpose}" (use PRODUCT, LIFESTYLE, or DETAIL).`);
      else purpose = purposeRaw as "PRODUCT" | "LIFESTYLE" | "DETAIL";
    }

    const altText = altTextRaw !== undefined && altTextRaw !== "" ? altTextRaw : undefined;

    if (imageUrl) {
      const schemaCheck = (existingImage ? imageUpdateSchema : imageCreateSchema).safeParse({
        url: imageUrl,
        ...(altText !== undefined ? { altText } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(purpose !== undefined ? { purpose } : {}),
      });
      if (!schemaCheck.success) {
        for (const issues of Object.values(schemaCheck.error.flatten().fieldErrors)) {
          if (issues) errors.push(...issues);
        }
      }
    }

    if (errors.length > 0) {
      return { rowNumber, sku, imageUrl, action: "ERROR", errors };
    }

    if (!existingImage) {
      return {
        rowNumber, sku, imageUrl, action: "CREATE", errors: [],
        productId: product!.id, altText: altText ?? null, sortOrder, purpose,
      };
    }

    const changed =
      (altText !== undefined && altText !== (existingImage.altText ?? "")) ||
      (sortOrder !== undefined && sortOrder !== existingImage.sortOrder) ||
      (purpose !== undefined && purpose !== existingImage.purpose);

    return {
      rowNumber, sku, imageUrl,
      action: changed ? "UPDATE" : "UNCHANGED",
      errors: [],
      productId: product!.id,
      existingImageId: existingImage.id,
      altText: altText !== undefined ? altText : undefined,
      sortOrder,
      purpose,
    };
  });
}

export interface ProductImageImportOutcome {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { rowNumber: number; sku: string; errors: string[] }[];
}

export async function applyProductImageImportRows(
  rawRows: Record<string, string>[],
  actorUserId: string
): Promise<ProductImageImportOutcome> {
  const rows = await validateProductImageImportRows(rawRows);
  const outcome: ProductImageImportOutcome = { created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

  for (const row of rows) {
    if (row.action === "ERROR") {
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, sku: row.sku, errors: row.errors });
      continue;
    }
    if (row.action === "UNCHANGED") {
      outcome.unchanged++;
      continue;
    }

    try {
      if (row.action === "CREATE") {
        let sortOrder = row.sortOrder;
        if (sortOrder === undefined) {
          const last = await prisma.productImage.findFirst({
            where: { productId: row.productId! },
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
          });
          sortOrder = (last?.sortOrder ?? -1) + 1;
        }
        await prisma.productImage.create({
          data: {
            productId: row.productId!,
            url: row.imageUrl,
            altText: row.altText ?? null,
            sortOrder,
            purpose: row.purpose ?? "PRODUCT",
          },
        });
        outcome.created++;
      } else {
        const data: { altText?: string | null; sortOrder?: number; purpose?: "PRODUCT" | "LIFESTYLE" | "DETAIL" } = {};
        if (row.altText !== undefined) data.altText = row.altText;
        if (row.sortOrder !== undefined) data.sortOrder = row.sortOrder;
        if (row.purpose !== undefined) data.purpose = row.purpose;
        if (Object.keys(data).length > 0) {
          await prisma.productImage.update({ where: { id: row.existingImageId! }, data });
        }
        outcome.updated++;
      }
    } catch (err) {
      console.error("[applyProductImageImportRows] row failed", row.rowNumber, err);
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, sku: row.sku, errors: ["Write failed — see server logs."] });
    }
  }

  if (outcome.created > 0 || outcome.updated > 0) {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "product_image.imported",
      entity: "ProductImage",
      metadata: {
        operation: "IMPORT",
        created: outcome.created,
        updated: outcome.updated,
        unchanged: outcome.unchanged,
        failed: outcome.failed,
      } satisfies ProductImageImportMetadata,
    });
  }

  return outcome;
}
