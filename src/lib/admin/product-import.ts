import "server-only";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProductStatus } from "@prisma/client";
import { EXPORT_COLUMNS } from "@/lib/admin/product-export";
import { WELL_KNOWN_ATTRIBUTE_LABELS, upsertAttribute } from "@/lib/admin/product-attributes";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/admin/activity-log";
import { recordSlugChange } from "@/lib/products/slug-redirects";

const HEADER_TO_KEY = new Map(EXPORT_COLUMNS.map((c) => [c.header.trim().toLowerCase(), c.key]));

/** Reads either CSV or XLSX (by filename extension) into plain row objects
 *  keyed by our internal column keys — the same shape /export produces, so
 *  an unmodified export is always a valid re-import (round-trip). Blank
 *  rows are skipped. */
export async function parseSpreadsheet(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  const isXlsx = filename.toLowerCase().endsWith(".xlsx");

  if (isXlsx) {
    await wb.xlsx.load(buffer);
  } else {
    await wb.csv.read(Readable.from(buffer));
  }

  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const headerCells: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = String(cell.value ?? "").trim().toLowerCase();
    headerCells[colNumber] = HEADER_TO_KEY.get(normalized) ?? normalized;
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

export type ImportRowAction = "CREATE" | "UPDATE" | "UNCHANGED" | "ERROR";

export interface ImportRowData {
  name?: string;
  slug?: string;
  description?: string;
  price?: string;
  discountPrice?: string | null;
  categoryId?: string;
  themeId?: string | null;
  status?: ProductStatus;
  lowStockAt?: number;
  stockAvailable?: number;
  material?: string;
  color?: string;
  width?: string;
  height?: string;
  careInstructions?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
}

export interface ImportRowResult {
  rowNumber: number;
  sku: string;
  action: ImportRowAction;
  errors: string[];
  data?: ImportRowData;
  existingProductId?: string;
  existingSlug?: string;
}

function parseBool(v: string, errors: string[], fieldName: string): boolean | undefined {
  if (!v) return undefined;
  const s = v.trim().toUpperCase();
  if (["YES", "TRUE", "1"].includes(s)) return true;
  if (["NO", "FALSE", "0"].includes(s)) return false;
  errors.push(`Invalid ${fieldName}: "${v}" (use YES/NO).`);
  return undefined;
}

type ExistingProduct = Prisma.ProductGetPayload<{ include: { attributes: true } }>;

function rowDiffersFromExisting(data: ImportRowData, existing: ExistingProduct): boolean {
  const attr = (label: string) => existing.attributes.find((a) => a.label === label)?.value ?? "";

  if (data.name !== undefined && data.name !== existing.name) return true;
  if (data.slug !== undefined && data.slug !== existing.slug) return true;
  if (data.description !== undefined && data.description !== existing.description) return true;
  if (data.price !== undefined && Number(data.price) !== Number(existing.price)) return true;
  if (data.discountPrice !== undefined) {
    const existingDiscount = existing.discountPrice ? Number(existing.discountPrice) : null;
    const nextDiscount = data.discountPrice === null ? null : Number(data.discountPrice);
    if (existingDiscount !== nextDiscount) return true;
  }
  if (data.categoryId !== undefined && data.categoryId !== existing.categoryId) return true;
  if (data.themeId !== undefined && data.themeId !== (existing.themeId ?? null)) return true;
  if (data.status !== undefined && data.status !== existing.status) return true;
  if (data.lowStockAt !== undefined && data.lowStockAt !== existing.lowStockAt) return true;
  if (data.material !== undefined && data.material !== attr("Material")) return true;
  if (data.color !== undefined && data.color !== attr("Color")) return true;
  if (data.width !== undefined && data.width !== attr("Width")) return true;
  if (data.height !== undefined && data.height !== attr("Height")) return true;
  if (data.careInstructions !== undefined && data.careInstructions !== attr("Care Instructions")) return true;
  if (data.isNewArrival !== undefined && data.isNewArrival !== existing.isNewArrival) return true;
  if (data.isBestSeller !== undefined && data.isBestSeller !== existing.isBestSeller) return true;
  if (data.isTrending !== undefined && data.isTrending !== existing.isTrending) return true;
  if (data.isFeatured !== undefined && data.isFeatured !== existing.isFeatured) return true;

  return false;
}

/**
 * SKU is the sole matching key (per the prompt's explicit instruction):
 * existing SKU -> UPDATE (or UNCHANGED if nothing provided differs from
 * the current row), new SKU -> CREATE. Re-uploading the same file never
 * creates duplicates. Uses the same business rules as the admin UI
 * (price/compare-at validity, category/theme must exist, status enum,
 * required fields for new products) rather than a separate validation path.
 */
export async function validateImportRows(rawRows: Record<string, string>[]): Promise<ImportRowResult[]> {
  const [categories, themes] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.theme.findMany({ select: { id: true, slug: true } }),
  ]);
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const themeBySlug = new Map(themes.map((t) => [t.slug, t.id]));

  const skusInFile = rawRows.map((r) => (r.sku || "").trim()).filter(Boolean);
  const existingProducts = await prisma.product.findMany({
    where: { sku: { in: skusInFile } },
    include: { attributes: true },
  });
  const existingBySku = new Map(existingProducts.map((p) => [p.sku, p]));

  // Slug-conflict lookups (Module 34) — bulk-prefetched once, same "fetch
  // then check synchronously per row" shape as categories/themes above,
  // rather than an async isSlugAvailable() call per row inside the loop
  // below. Checks BOTH tables Module 32's isSlugAvailable() checks: a live
  // product's current slug, and any OTHER product's retired slug (a
  // ProductSlugRedirect row) — the DB's own unique constraints can't catch
  // the second case on their own, since Product.slug and
  // ProductSlugRedirect.oldSlug are separate columns on separate tables.
  const [allProductSlugs, allRedirects] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.productSlugRedirect.findMany({ select: { oldSlug: true, productId: true } }),
  ]);
  const productIdBySlug = new Map(allProductSlugs.map((p) => [p.slug, p.id]));
  const redirectOwnerBySlug = new Map(allRedirects.map((r) => [r.oldSlug, r.productId]));

  const seenInFile = new Set<string>();
  const results: ImportRowResult[] = [];

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // header occupies row 1
    const sku = (row.sku || "").trim();
    const errors: string[] = [];

    if (!sku) {
      results.push({ rowNumber, sku: "", action: "ERROR", errors: ["SKU is required."] });
      return;
    }
    if (seenInFile.has(sku)) {
      results.push({ rowNumber, sku, action: "ERROR", errors: [`Duplicate SKU within this file: ${sku}`] });
      return;
    }
    seenInFile.add(sku);

    const existing = existingBySku.get(sku);

    let price: string | undefined;
    if (row.price) {
      const n = Number(row.price);
      // Module 34: Number.isFinite also catches "Infinity" (Number.isNaN(Infinity) is false).
      if (!Number.isFinite(n) || n < 0) errors.push(`Invalid price: "${row.price}".`);
      else price = String(n);
    } else if (!existing) {
      errors.push("Price is required for new products.");
    }

    let discountPrice: string | null | undefined;
    if (row.compareAtPrice) {
      const n = Number(row.compareAtPrice);
      if (!Number.isFinite(n) || n < 0) errors.push(`Invalid compare-at price: "${row.compareAtPrice}".`);
      else discountPrice = String(n);
    }
    const effectivePrice = price !== undefined ? Number(price) : existing ? Number(existing.price) : undefined;
    if (discountPrice !== undefined && effectivePrice !== undefined && Number(discountPrice) >= effectivePrice) {
      errors.push("Compare-at price must be less than price.");
    }

    let categoryId: string | undefined;
    if (row.categorySlug) {
      const id = categoryBySlug.get(row.categorySlug);
      if (!id) errors.push(`Unknown category: "${row.categorySlug}".`);
      else categoryId = id;
    } else if (!existing) {
      errors.push("Category is required for new products.");
    }

    let themeId: string | null | undefined;
    if (row.themeSlug) {
      const id = themeBySlug.get(row.themeSlug);
      if (!id) errors.push(`Unknown theme: "${row.themeSlug}".`);
      else themeId = id;
    }

    let status: ProductStatus | undefined;
    if (row.status) {
      const upper = row.status.toUpperCase();
      if (!["ACTIVE", "DRAFT", "ARCHIVED"].includes(upper)) errors.push(`Invalid status: "${row.status}".`);
      else status = upper as ProductStatus;
    }

    let lowStockAt: number | undefined;
    if (row.lowStockThreshold) {
      const n = parseInt(row.lowStockThreshold, 10);
      if (Number.isNaN(n) || n < 0) errors.push(`Invalid low stock threshold: "${row.lowStockThreshold}".`);
      else lowStockAt = n;
    }

    const isNewArrival = parseBool(row.newArrival, errors, "New Arrival");
    const isBestSeller = parseBool(row.bestSeller, errors, "Best Seller");
    const isTrending = parseBool(row.trending, errors, "Trending");
    const isFeatured = parseBool(row.featured, errors, "Featured");

    if (!existing) {
      if (!row.name) errors.push("Product Name is required for new products.");
      if (!row.description) errors.push("Description is required for new products.");
    }

    const slug = row.slug ? row.slug.trim() : row.name ? slugify(row.name) : undefined;

    // Same rule as isSlugAvailable() (Module 32/33, single-product path):
    // a slug is takeable only if no OTHER product currently lives there and
    // no retired-slug redirect for it belongs to a different product. A
    // product re-submitting its OWN current (or one of its own past) slugs
    // is never flagged as a conflict against itself.
    if (slug) {
      const liveOwnerId = productIdBySlug.get(slug);
      if (liveOwnerId && liveOwnerId !== existing?.id) {
        errors.push(`Slug "${slug}" is already in use by another product.`);
      } else {
        const redirectOwnerId = redirectOwnerBySlug.get(slug);
        if (redirectOwnerId && redirectOwnerId !== existing?.id) {
          errors.push(`Slug "${slug}" previously belonged to a different product and now redirects to it.`);
        }
      }
    }

    if (errors.length > 0) {
      results.push({ rowNumber, sku, action: "ERROR", errors });
      return;
    }

    const data: ImportRowData = {
      name: row.name || undefined,
      slug,
      description: row.description || undefined,
      price,
      discountPrice,
      categoryId,
      themeId,
      status,
      lowStockAt,
      material: row.material !== undefined && row.material !== "" ? row.material : undefined,
      color: row.color !== undefined && row.color !== "" ? row.color : undefined,
      width: row.width !== undefined && row.width !== "" ? row.width : undefined,
      height: row.height !== undefined && row.height !== "" ? row.height : undefined,
      careInstructions: row.careInstructions !== undefined && row.careInstructions !== "" ? row.careInstructions : undefined,
      isNewArrival,
      isBestSeller,
      isTrending,
      isFeatured,
      stockAvailable: !existing && row.stock ? parseInt(row.stock, 10) || 0 : undefined,
    };

    if (!existing) {
      results.push({ rowNumber, sku, action: "CREATE", errors: [], data });
      return;
    }

    const changed = rowDiffersFromExisting(data, existing);
    results.push({ rowNumber, sku, action: changed ? "UPDATE" : "UNCHANGED", errors: [], data, existingProductId: existing.id, existingSlug: existing.slug });
  });

  return results;
}

export interface ImportApplyOutcome {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { rowNumber: number; sku: string; errors: string[] }[];
}

async function writeAttributes(tx: Prisma.TransactionClient, productId: string, data: ImportRowData) {
  if (data.material !== undefined) await upsertAttribute(tx, productId, WELL_KNOWN_ATTRIBUTE_LABELS[0], data.material);
  if (data.color !== undefined) await upsertAttribute(tx, productId, WELL_KNOWN_ATTRIBUTE_LABELS[1], data.color);
  if (data.width !== undefined) await upsertAttribute(tx, productId, WELL_KNOWN_ATTRIBUTE_LABELS[2], data.width);
  if (data.height !== undefined) await upsertAttribute(tx, productId, WELL_KNOWN_ATTRIBUTE_LABELS[3], data.height);
  if (data.careInstructions !== undefined)
    await upsertAttribute(tx, productId, WELL_KNOWN_ATTRIBUTE_LABELS[4], data.careInstructions);
}

/**
 * Re-validates against the current database (never trusts the client's
 * earlier preview blindly) and writes each row as its own small
 * transaction — products are independent rows, so one bad row can't roll
 * back rows already committed, and the summary UI ("X created, Y updated,
 * Z failed") is naturally row-level. Never touches stockAvailable directly
 * for existing products (stock only changes through stock-service.ts);
 * for brand-new rows, the initial stock quantity is a one-time create
 * value, same as the admin "New Product" form allows.
 */
export async function applyImportRows(rawRows: Record<string, string>[], actorUserId: string): Promise<ImportApplyOutcome> {
  const rows = await validateImportRows(rawRows);

  const outcome: ImportApplyOutcome = { created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

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
      await prisma.$transaction(async (tx) => {
        if (row.action === "CREATE") {
          const created = await tx.product.create({
            data: {
              name: row.data!.name!,
              slug: row.data!.slug!,
              description: row.data!.description!,
              sku: row.sku,
              price: row.data!.price!,
              discountPrice: row.data!.discountPrice ?? null,
              categoryId: row.data!.categoryId!,
              themeId: row.data!.themeId ?? null,
              status: row.data!.status ?? "DRAFT",
              lowStockAt: row.data!.lowStockAt ?? 5,
              stockAvailable: row.data!.stockAvailable ?? 0,
              isNewArrival: row.data!.isNewArrival ?? false,
              isBestSeller: row.data!.isBestSeller ?? false,
              isTrending: row.data!.isTrending ?? false,
              isFeatured: row.data!.isFeatured ?? false,
            },
          });
          await writeAttributes(tx, created.id, row.data!);
        } else {
          const productData: Prisma.ProductUpdateInput = {};
          const d = row.data!;
          if (d.name !== undefined) productData.name = d.name;
          if (d.slug !== undefined) productData.slug = d.slug;
          if (d.description !== undefined) productData.description = d.description;
          if (d.price !== undefined) productData.price = d.price;
          if (d.discountPrice !== undefined) productData.discountPrice = d.discountPrice;
          if (d.categoryId !== undefined) productData.category = { connect: { id: d.categoryId } };
          if (d.themeId !== undefined) productData.theme = d.themeId ? { connect: { id: d.themeId } } : { disconnect: true };
          if (d.status !== undefined) productData.status = d.status;
          if (d.lowStockAt !== undefined) productData.lowStockAt = d.lowStockAt;
          if (d.isNewArrival !== undefined) productData.isNewArrival = d.isNewArrival;
          if (d.isBestSeller !== undefined) productData.isBestSeller = d.isBestSeller;
          if (d.isTrending !== undefined) productData.isTrending = d.isTrending;
          if (d.isFeatured !== undefined) productData.isFeatured = d.isFeatured;

          if (Object.keys(productData).length > 0) {
            await tx.product.update({ where: { id: row.existingProductId! }, data: productData });
          }

          // Module 34: a bulk-imported slug change must record a
          // ProductSlugRedirect exactly like the single-product edit form
          // does (see PATCH /api/admin/products/[id]), or the product's old
          // URL would silently stop redirecting. recordSlugChange() itself
          // no-ops when the slug hasn't actually changed, so this is safe
          // to call whenever the row carries a slug value at all.
          if (d.slug !== undefined) {
            await recordSlugChange(tx, row.existingProductId!, row.existingSlug!, d.slug);
          }

          await writeAttributes(tx, row.existingProductId!, d);
        }
      });

      if (row.action === "CREATE") outcome.created++;
      else outcome.updated++;
    } catch (err) {
      console.error("[applyImportRows] row failed", row.rowNumber, err);
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, sku: row.sku, errors: ["Write failed — see server logs."] });
    }
  }

  // One aggregate entry per import run, mirroring applyBulkEdit's treatment
  // exactly — import rows are written one small transaction at a time
  // (existing architecture, unchanged here), so there's no single
  // transaction boundary to attach a per-operation audit entry to. Skipped
  // entirely if nothing was actually created or updated (an all-unchanged
  // or all-failed run has nothing to claim happened).
  if (outcome.created > 0 || outcome.updated > 0) {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "product.imported",
      entity: "Product",
      metadata: {
        operation: "IMPORT",
        affectedProductCount: outcome.created + outcome.updated,
        created: outcome.created,
        updated: outcome.updated,
        unchanged: outcome.unchanged,
        failed: outcome.failed,
      },
    });
  }

  return outcome;
}
