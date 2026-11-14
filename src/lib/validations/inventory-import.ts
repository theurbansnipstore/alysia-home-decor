import { z } from "zod";
import { STOCK_ADJUSTMENT_REASONS } from "@/lib/inventory/stock-service";

/** One row = one stock-service adjustStock() call, so validation mirrors
 *  stockAdjustmentSchema exactly (same reason enum, same non-zero rule) —
 *  this importer is a bulk front-end for the existing adjustment path, not
 *  a parallel one. */
export const inventoryImportRawRowSchema = z.record(z.string());
export const inventoryImportRawRowsSchema = z.array(inventoryImportRawRowSchema).min(1).max(5000);

export const INVENTORY_IMPORT_REASONS = STOCK_ADJUSTMENT_REASONS;
