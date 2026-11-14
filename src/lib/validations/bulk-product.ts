import { z } from "zod";

const statusEnum = z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]);

// Module 34: same Number.isFinite fix as src/lib/validations/product.ts's
// moneyField — the old !isNaN(...) && >= 0 check let the string "Infinity"
// through, which would have failed as an unhandled DB error against a
// Decimal(10,2) column instead of a clean 400.
const moneyField = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Must be a non-negative number.");

/** "All matching filters" reuses the exact same filter shape as the admin
 *  product list (buildAdminProductWhere) — page/pageSize/sort excluded,
 *  since bulk selection targets every match, not one page of them. */
export const bulkFilterSchema = z.object({
  q: z.string().trim().optional(),
  status: statusEnum.optional(),
  categoryId: z.string().optional(),
  themeId: z.string().optional(),
  stockStatus: z.enum(["out", "low", "in"]).optional(),
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
});
export type BulkFilters = z.infer<typeof bulkFilterSchema>;

export const bulkSelectionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("ids"), productIds: z.array(z.string()).min(1, "Select at least one product.") }),
  z.object({ mode: z.literal("filtered"), filters: bulkFilterSchema }),
]);
export type BulkSelectionInput = z.infer<typeof bulkSelectionSchema>;

/** Every field here is applied identically to every selected product.
 *  Deliberately excludes stockAvailable (and any stock quantity) — stock
 *  only ever changes through stock-service.ts so every change gets a
 *  StockMovement row; a bulk operation can't produce a meaningful per-
 *  product movement reason. lowStockAt is a plain config number (not an
 *  inventory movement) so it's safe to include. */
export const bulkChangesSchema = z
  .object({
    price: moneyField.optional(),
    discountPrice: moneyField.nullable().optional(),
    categoryId: z.string().min(1).optional(),
    themeId: z.string().nullable().optional(),
    status: statusEnum.optional(),
    lowStockAt: z.number().int().nonnegative().optional(),
    isFeatured: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    isTrending: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    material: z.string().trim().max(500).optional(),
    color: z.string().trim().max(500).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, { message: "Select at least one field to change." });
export type BulkChangesInput = z.infer<typeof bulkChangesSchema>;

export const bulkEditRequestSchema = z.object({
  selection: bulkSelectionSchema,
  changes: bulkChangesSchema,
});
export type BulkEditRequestInput = z.infer<typeof bulkEditRequestSchema>;

export const MAX_BULK_SELECTION = 5000;
