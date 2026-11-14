import "server-only";
import { prisma } from "@/lib/prisma";
import type { StockMovement } from "@prisma/client";
import { emit } from "@/lib/services/notifications";

export const STOCK_ADJUSTMENT_REASONS = ["purchase", "restock", "damage", "lost", "correction", "return", "other"] as const;
export type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

export interface AdjustStockInput {
  productId: string;
  change: number;
  reason: StockAdjustmentReason;
  note?: string | null;
  adjustedByName?: string | null;
}

export interface AdjustStockResult {
  success: boolean;
  error?: string;
  stockAvailable?: number;
  movement?: StockMovement;
}

/**
 * The only path allowed to change Product.stockAvailable outside of order
 * placement (order-service.ts's own transaction). Always pairs the stock
 * change with a StockMovement row so history is never silently overwritten.
 */
export async function adjustStock(input: AdjustStockInput): Promise<AdjustStockResult> {
  const { productId, change, reason, note, adjustedByName } = input;
  if (change === 0) {
    return { success: false, error: "Adjustment must be non-zero." };
  }

  try {
    const { previousStock, stockAvailable, lowStockAt, movement } = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { lowStockAt: true },
      });
      if (!product) throw new Error("NOT_FOUND");

      // Atomic guarded update (Module 34) — same race-proof pattern
      // order-service.ts already uses for checkout decrements: the
      // stockAvailable >= -change check and the write happen in one SQL
      // statement, so two concurrent adjustments on the same product can't
      // both pass a stale in-app negative-stock check computed from a
      // separate read and then both write, silently driving the real
      // column negative (or losing one of the two movements) between them.
      // `-change` is negative whenever `change` is an increase, so the
      // guard is always satisfied for increases (stock is never negative
      // already) and only bites for decreases, matching the old check's
      // semantics exactly for the single-writer case.
      const updated = await tx.product.updateMany({
        where: { id: productId, stockAvailable: { gte: -change } },
        data: { stockAvailable: { increment: change } },
      });
      if (updated.count === 0) throw new Error("NEGATIVE_STOCK");

      // previousStock derived exactly from the known change amount (same
      // technique order-service.ts uses) rather than the earlier read,
      // which could already be stale by the time this line runs.
      const after = await tx.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } });
      const newStockAvailable = after!.stockAvailable;

      const created = await tx.stockMovement.create({
        data: { productId, change, reason, note: note || null, adjustedByName: adjustedByName || null },
      });

      return { previousStock: newStockAvailable - change, stockAvailable: newStockAvailable, lowStockAt: product.lowStockAt, movement: created };
    });

    await notifyStockCrossing(productId, previousStock, stockAvailable, lowStockAt);

    return { success: true, stockAvailable, movement };
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return { success: false, error: "Product not found." };
    }
    if (err instanceof Error && err.message === "NEGATIVE_STOCK") {
      return { success: false, error: "This adjustment would take stock below zero." };
    }
    throw err;
  }
}

export interface StockMovementWithBalance extends StockMovement {
  previousStock: number;
  newStock: number;
}

/**
 * StockMovement only stores the delta (`change`), not a before/after
 * snapshot — previous/new stock are reconstructed at read time by walking
 * backward from the product's current stockAvailable, which is exact
 * (every stock-changing write, including the order-flow paths that bypass
 * adjustStock(), always pairs with a StockMovement row for that product).
 */
export async function getStockMovementHistory(productId: string, take = 50): Promise<StockMovementWithBalance[]> {
  const [product, movements] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { stockAvailable: true } }),
    prisma.stockMovement.findMany({ where: { productId }, orderBy: { createdAt: "desc" }, take }),
  ]);
  if (!product) return [];

  let runningStock = product.stockAvailable;
  return movements.map((m) => {
    const newStock = runningStock;
    const previousStock = newStock - m.change;
    runningStock = previousStock;
    return { ...m, previousStock, newStock };
  });
}

export interface InventoryStats {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
}

/** Computed in application code over a lightweight (id/stock/threshold-only)
 *  select rather than raw SQL — "low stock" is a per-row comparison between
 *  two columns (stockAvailable vs. lowStockAt) that plain Prisma `where`
 *  filters can't express, and this stays consistent with the codebase's
 *  existing pattern of capping at MAX_BULK_SELECTION-scale reads rather than
 *  introducing a new raw-query code path. Archived products are excluded —
 *  they're no longer sellable, so their stock isn't an operational concern. */
export async function getInventoryStats(): Promise<InventoryStats> {
  const products = await prisma.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { stockAvailable: true, lowStockAt: true },
  });

  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalUnits = 0;

  for (const p of products) {
    totalUnits += p.stockAvailable;
    if (p.stockAvailable <= 0) outOfStock++;
    else if (p.stockAvailable <= p.lowStockAt) lowStock++;
    else inStock++;
  }

  return { totalProducts: products.length, inStock, lowStock, outOfStock, totalUnits };
}

export type StockStatus = "out" | "low" | "in";

/** Same two-column-comparison constraint as getInventoryStats() — resolved
 *  by fetching minimal columns and filtering in Node, then handing back
 *  just the matching IDs for the caller to intersect with its other Prisma
 *  `where` filters. Capped at 5000, matching every other bulk-scale read
 *  in this codebase (import/export/bulk-edit). */
export async function getProductIdsByStockStatus(status: StockStatus): Promise<string[]> {
  const products = await prisma.product.findMany({
    select: { id: true, stockAvailable: true, lowStockAt: true },
    take: 5000,
  });

  return products
    .filter((p) => {
      if (status === "out") return p.stockAvailable <= 0;
      if (status === "low") return p.stockAvailable > 0 && p.stockAvailable <= p.lowStockAt;
      return p.stockAvailable > p.lowStockAt;
    })
    .map((p) => p.id);
}

export interface RecentMovement extends StockMovement {
  product: { id: string; name: string; sku: string };
}

export async function getRecentStockMovements(take = 20): Promise<RecentMovement[]> {
  return prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { product: { select: { id: true, name: true, sku: true } } },
  });
}

/** The 3 exact raw reason strings the order/payment flow writes directly
 *  (order-service.ts, razorpay-finalize.ts, status-service.ts) — everything
 *  else is a manual adjustment reason from STOCK_ADJUSTMENT_REASONS. Lets
 *  the UI show a clear "Order"/"Cancellation"/"Return"/"Admin" source
 *  without a new column — reason already encodes it, so no migration is
 *  needed to satisfy "don't make an automated movement look manual." */
const AUTOMATED_MOVEMENT_SOURCES: Record<string, string> = {
  order: "Order",
  cancelled: "Cancellation",
  returned: "Return",
};

export function getMovementSource(reason: string): string {
  return AUTOMATED_MOVEMENT_SOURCES[reason] ?? "Admin";
}

type StockCrossing = "low" | "out" | null;

/** Fires only on the FIRST decrease that crosses INTO a threshold, not on
 *  every subsequent movement while stock stays low/out (that would spam
 *  admins on every damage/order/correction against an already-flagged
 *  product) and never on an increase (recovering stock isn't a new alert —
 *  the dashboard already reflects current status live). A product that
 *  goes straight from healthy to 0 in one adjustment only fires
 *  "out_of_stock", not both — "out" is checked first and is strictly the
 *  more urgent state. */
function detectStockCrossing(previousStock: number, newStock: number, lowStockAt: number): StockCrossing {
  if (newStock >= previousStock) return null;
  if (previousStock > 0 && newStock <= 0) return "out";
  if (previousStock > lowStockAt && newStock <= lowStockAt) return "low";
  return null;
}

/** Best-effort, non-blocking side effect — a failure here must never surface
 *  as a stock-adjustment failure to the caller, matching this project's
 *  established "a side effect must never break the primary action" rule. */
export async function notifyStockCrossing(
  productId: string,
  previousStock: number,
  newStock: number,
  lowStockAt: number
): Promise<void> {
  try {
    const crossing = detectStockCrossing(previousStock, newStock, lowStockAt);
    if (!crossing) return;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true, sku: true } });
    if (!product) return;

    await emit(crossing === "out" ? "inventory.out_of_stock" : "inventory.low_stock", {
      productId,
      productName: product.name,
      sku: product.sku,
      stockAvailable: newStock,
      lowStockAt,
    });
  } catch (err) {
    console.error("[stock-service] notifyStockCrossing failed (stock change was not affected)", productId, err);
  }
}
