import "server-only";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { adjustStock, STOCK_ADJUSTMENT_REASONS, type StockAdjustmentReason } from "@/lib/inventory/stock-service";

export const INVENTORY_IMPORT_HEADERS = ["sku", "quantity", "reason", "notes"] as const;

/** Same CSV/XLSX reader as product-import.ts (ExcelJS, by-filename-extension),
 *  kept as its own small parser rather than sharing product-import's version
 *  since the expected columns are entirely different (SKU/Quantity/Reason/
 *  Notes vs. the full product field set). */
export async function parseInventorySpreadsheet(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
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

export interface InventoryImportRowResult {
  rowNumber: number;
  sku: string;
  quantity: number | null;
  reason: string;
  note: string | null;
  errors: string[];
  ok: boolean;
  productId?: string;
  productName?: string;
  currentStock?: number;
  projectedStock?: number;
}

const REASON_SET = new Set<string>(STOCK_ADJUSTMENT_REASONS);

function parseQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(/^\+/, "");
  if (!/^-?\d+$/.test(cleaned)) return null;
  const n = parseInt(cleaned, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Validates against the current database and, for rows targeting the same
 * SKU more than once in one file, simulates them in file order against a
 * running per-SKU balance — so "row 1: +20, row 2: -25" on the same SKU
 * correctly fails row 2 if starting stock was under 5, exactly like it
 * would if applied one at a time through the single-product Stock panel.
 * Never touches the database — read-only, safe to call repeatedly.
 */
export async function validateInventoryImportRows(rawRows: Record<string, string>[]): Promise<InventoryImportRowResult[]> {
  const skusInFile = Array.from(new Set(rawRows.map((r) => (r.sku || "").trim()).filter(Boolean)));
  const products = await prisma.product.findMany({
    where: { sku: { in: skusInFile } },
    select: { id: true, sku: true, name: true, stockAvailable: true },
  });
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const runningStock = new Map(products.map((p) => [p.sku, p.stockAvailable]));

  return rawRows.map((row, idx) => {
    const rowNumber = idx + 2;
    const sku = (row.sku || "").trim();
    const reason = (row.reason || "").trim().toLowerCase();
    const note = row.notes?.trim() || null;
    const errors: string[] = [];

    if (!sku) errors.push("SKU is required.");
    const product = sku ? bySku.get(sku) : undefined;
    if (sku && !product) errors.push(`No product with SKU "${sku}".`);

    const quantity = row.quantity !== undefined ? parseQuantity(row.quantity) : null;
    if (!row.quantity || !row.quantity.trim()) errors.push("Quantity is required.");
    else if (quantity === null) errors.push(`Invalid quantity: "${row.quantity}" (use a whole number like +20 or -3).`);
    else if (quantity === 0) errors.push("Quantity must be non-zero.");

    if (!reason) errors.push("Reason is required.");
    else if (!REASON_SET.has(reason)) errors.push(`Invalid reason: "${row.reason}" (use one of ${STOCK_ADJUSTMENT_REASONS.join(", ")}).`);

    // Module 34: StockMovement.note is VARCHAR(191) (schema.prisma has no
    // @db.VarChar/@db.Text override on it) — same fix as
    // stockAdjustmentSchema in validations/product.ts, needed here too
    // since applyInventoryImportRows() passes this straight to the same
    // adjustStock() write. Without this, a long Notes cell only surfaces as
    // an unhandled Prisma error deep inside the apply step, not a clean
    // per-row validation failure in the preview.
    if (note && note.length > 191) errors.push(`Note is too long (${note.length}/191 characters).`);

    const currentStock = product ? runningStock.get(sku) : undefined;
    let projectedStock: number | undefined;
    if (product && quantity !== null && quantity !== 0) {
      projectedStock = currentStock! + quantity;
      if (projectedStock < 0) {
        errors.push(`This adjustment would take stock below zero (running stock ${currentStock}, change ${quantity}).`);
      }
    }

    const ok = errors.length === 0;
    // Only a fully valid row (right SKU, quantity, AND reason) advances the
    // running per-SKU balance for subsequent rows targeting the same SKU —
    // apply() skips invalid rows entirely, so the simulation must too, or a
    // row with a bad reason but an in-range quantity would wrongly "use up"
    // stock that a later, genuinely valid row in the file still needs.
    if (ok && product && projectedStock !== undefined) {
      runningStock.set(sku, projectedStock);
    }

    return {
      rowNumber,
      sku,
      quantity,
      reason,
      note,
      errors,
      ok,
      productId: product?.id,
      productName: product?.name,
      currentStock,
      projectedStock,
    };
  });
}

export interface InventoryImportApplyOutcome {
  applied: number;
  failed: number;
  errors: { rowNumber: number; sku: string; errors: string[] }[];
}

/**
 * Re-validates against the current database (never trusts the client's
 * earlier preview) and applies rows one at a time, in file order, through
 * the existing adjustStock() — the same single validated path the
 * per-product Stock panel uses, so every row still gets its own
 * StockMovement row and the same negative-stock guard. Sequential (not
 * parallel/chunked like bulk product edit) because multiple rows can target
 * the same SKU and each one's negative-stock check must see the previous
 * row's already-committed change.
 */
export async function applyInventoryImportRows(
  rawRows: Record<string, string>[],
  adjustedByName?: string | null
): Promise<InventoryImportApplyOutcome> {
  const rows = await validateInventoryImportRows(rawRows);
  const outcome: InventoryImportApplyOutcome = { applied: 0, failed: 0, errors: [] };

  for (const row of rows) {
    if (!row.ok || !row.productId || row.quantity === null) {
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, sku: row.sku, errors: row.errors });
      continue;
    }

    const result = await adjustStock({
      productId: row.productId,
      change: row.quantity,
      reason: row.reason as StockAdjustmentReason,
      note: row.note,
      adjustedByName,
    });

    if (result.success) {
      outcome.applied++;
    } else {
      outcome.failed++;
      outcome.errors.push({ rowNumber: row.rowNumber, sku: row.sku, errors: [result.error || "Adjustment failed."] });
    }
  }

  return outcome;
}
