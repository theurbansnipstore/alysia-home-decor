import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildAdminProductWhere } from "@/lib/data/admin-products";
import { MAX_BULK_SELECTION, type BulkChangesInput, type BulkSelectionInput } from "@/lib/validations/bulk-product";
import { upsertAttribute } from "@/lib/admin/product-attributes";
import { getProductIdsByStockStatus } from "@/lib/inventory/stock-service";
import { logActivity } from "@/lib/admin/activity-log";

/** Capped sample size for affectedProductIds in the aggregate audit entry — never the full list for a large selection (Module 23 Part 5). */
const AUDIT_ID_SAMPLE_SIZE = 25;

export interface BulkEditRowResult {
  productId: string;
  sku: string;
  ok: boolean;
  error?: string;
}

export interface BulkEditEvaluation {
  totalSelected: number;
  rows: BulkEditRowResult[];
  globalError?: string;
}

async function resolveSelection(selection: BulkSelectionInput): Promise<string[]> {
  if (selection.mode === "ids") return selection.productIds;
  const { stockStatus, ...restFilters } = selection.filters;
  const where = buildAdminProductWhere(restFilters);
  if (stockStatus) {
    where.id = { in: await getProductIdsByStockStatus(stockStatus) };
  }
  const rows = await prisma.product.findMany({ where, select: { id: true } });
  return rows.map((r) => r.id);
}

/** Shared by preview and apply — apply re-runs this rather than trusting
 *  the client's earlier preview, since data can change between the two
 *  requests (another admin edits a product, a category gets deleted, etc). */
export async function evaluateBulkEdit(
  selection: BulkSelectionInput,
  changes: BulkChangesInput
): Promise<BulkEditEvaluation> {
  const productIds = await resolveSelection(selection);

  if (productIds.length > MAX_BULK_SELECTION) {
    return {
      totalSelected: productIds.length,
      rows: [],
      globalError: `${productIds.length} products matched — bulk operations are limited to ${MAX_BULK_SELECTION} at a time. Narrow your filters and try again.`,
    };
  }
  if (productIds.length === 0) {
    return { totalSelected: 0, rows: [], globalError: "No products match this selection." };
  }

  if (changes.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: changes.categoryId }, select: { id: true } });
    if (!category) return { totalSelected: productIds.length, rows: [], globalError: "Selected category no longer exists." };
  }
  if (changes.themeId) {
    const theme = await prisma.theme.findUnique({ where: { id: changes.themeId }, select: { id: true } });
    if (!theme) return { totalSelected: productIds.length, rows: [], globalError: "Selected theme no longer exists." };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, price: true, discountPrice: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const rows: BulkEditRowResult[] = productIds.map((id) => {
    const product = byId.get(id);
    if (!product) return { productId: id, sku: "—", ok: false, error: "Product no longer exists." };

    const effectivePrice = changes.price !== undefined ? Number(changes.price) : Number(product.price);
    const effectiveDiscount =
      changes.discountPrice !== undefined
        ? changes.discountPrice === null
          ? null
          : Number(changes.discountPrice)
        : product.discountPrice
          ? Number(product.discountPrice)
          : null;

    if (effectiveDiscount !== null && effectiveDiscount >= effectivePrice) {
      return {
        productId: id,
        sku: product.sku,
        ok: false,
        error: `Compare-at price (₹${effectiveDiscount}) would not be less than price (₹${effectivePrice}).`,
      };
    }

    return { productId: id, sku: product.sku, ok: true };
  });

  return { totalSelected: productIds.length, rows };
}

export interface BulkEditApplyResult {
  totalSelected: number;
  applied: number;
  failed: number;
  failures: BulkEditRowResult[];
}

const CHUNK_SIZE = 100;

/** Chunked, per-chunk-transactional (not one giant transaction across the
 *  whole selection) — appropriate here because products are independent
 *  rows and the required UX ("42 updated / 5 errors") is row-level, not
 *  all-or-nothing. A failure in one chunk doesn't roll back chunks already
 *  committed; every row's outcome is reported either way. */
export async function applyBulkEdit(
  selection: BulkSelectionInput,
  changes: BulkChangesInput,
  actorUserId: string
): Promise<BulkEditApplyResult> {
  const evaluation = await evaluateBulkEdit(selection, changes);
  if (evaluation.globalError) {
    return { totalSelected: evaluation.totalSelected, applied: 0, failed: evaluation.totalSelected, failures: evaluation.rows };
  }

  const okRows = evaluation.rows.filter((r) => r.ok);
  const failures: BulkEditRowResult[] = evaluation.rows.filter((r) => !r.ok);

  const productData: Prisma.ProductUpdateInput = {};
  if (changes.price !== undefined) productData.price = changes.price;
  if (changes.discountPrice !== undefined) productData.discountPrice = changes.discountPrice;
  if (changes.categoryId !== undefined) productData.category = { connect: { id: changes.categoryId } };
  if (changes.themeId !== undefined) {
    productData.theme = changes.themeId ? { connect: { id: changes.themeId } } : { disconnect: true };
  }
  if (changes.status !== undefined) productData.status = changes.status;
  if (changes.lowStockAt !== undefined) productData.lowStockAt = changes.lowStockAt;
  if (changes.isFeatured !== undefined) productData.isFeatured = changes.isFeatured;
  if (changes.isBestSeller !== undefined) productData.isBestSeller = changes.isBestSeller;
  if (changes.isTrending !== undefined) productData.isTrending = changes.isTrending;
  if (changes.isNewArrival !== undefined) productData.isNewArrival = changes.isNewArrival;
  const hasProductFieldChanges = Object.keys(productData).length > 0;

  const changedFieldNames = [
    ...Object.keys(changes).filter((k) => k !== "material" && k !== "color" && (changes as Record<string, unknown>)[k] !== undefined),
  ];

  let applied = 0;
  const appliedProductIds: string[] = [];
  for (let i = 0; i < okRows.length; i += CHUNK_SIZE) {
    const chunk = okRows.slice(i, i + CHUNK_SIZE);
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          if (hasProductFieldChanges) {
            await tx.product.update({ where: { id: row.productId }, data: productData });
          }
          if (changes.material !== undefined) await upsertAttribute(tx, row.productId, "Material", changes.material);
          if (changes.color !== undefined) await upsertAttribute(tx, row.productId, "Color", changes.color);
        }
      });
      applied += chunk.length;
      appliedProductIds.push(...chunk.map((r) => r.productId));
    } catch (err) {
      console.error("[applyBulkEdit] chunk failed", err);
      chunk.forEach((row) => failures.push({ ...row, ok: false, error: "Update failed — see server logs." }));
    }
  }

  // One aggregate entry for the whole operation, never one per product —
  // a selection can be up to MAX_BULK_SELECTION (5000) products, and
  // per-row logging at that scale would flood ActivityLog for a single
  // admin action (Module 23 Part 5). Only written if something actually
  // applied — an all-failed run has nothing successful to claim happened.
  // Written after the per-chunk transactions (not wrapped with them): this
  // operation is deliberately NOT all-or-nothing (existing architecture,
  // unchanged by this module), so there is no single transaction boundary
  // to attach the audit entry to without misrepresenting partial success
  // as either fully atomic or fully independent of the writes it describes.
  if (applied > 0) {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "product.bulk_updated",
      entity: "Product",
      metadata: {
        operation: "BULK_UPDATE",
        affectedProductCount: applied,
        affectedProductIds: appliedProductIds.slice(0, AUDIT_ID_SAMPLE_SIZE),
        idsTruncated: appliedProductIds.length > AUDIT_ID_SAMPLE_SIZE,
        changedFields: changedFieldNames,
      },
    });
  }

  return { totalSelected: evaluation.totalSelected, applied, failed: failures.length, failures };
}
