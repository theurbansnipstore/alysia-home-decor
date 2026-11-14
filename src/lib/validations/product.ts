import { z } from "zod";

const statusEnum = z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]);

// Module 34: Number.isFinite (not the previous !isNaN(...) && >= 0) also
// rejects Infinity/-Infinity — "Infinity" is a valid JSON string and passed
// the old check (Number.isNaN(Infinity) is false), which would have reached
// a Decimal(10,2) column and failed as an unhandled DB error instead of a
// clean 400.
const moneyField = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Must be a non-negative number.");

export const productBaseFields = {
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, hyphen-separated."),
  description: z.string().trim().min(1, "Description is required."),
  price: moneyField,
  discountPrice: moneyField.nullable().optional(),
  sku: z.string().trim().min(1, "SKU is required.").max(100),
  barcode: z.string().trim().max(100).nullable().optional(),
  brand: z.string().trim().max(150).nullable().optional(),
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  dimensions: z.string().trim().max(150).nullable().optional(),
  tags: z.string().trim().max(500).nullable().optional(),
  status: statusEnum.optional(),
  categoryId: z.string().min(1, "Category is required."),
  themeId: z.string().nullable().optional(),
  lowStockAt: z.number().int().nonnegative().optional(),
  returnPolicyOverride: z.string().trim().max(5000).nullable().optional(),
};

// Module 34: discountPrice is displayed as the actual selling price (struck
// -through original alongside it — see ProductInfo.tsx), so a discountPrice
// >= price would show a "sale" that isn't one. product-import.ts's bulk
// import already enforces this same rule; this closes the same gap for the
// single-product create form, which had no such check. Partial updates
// can't be checked this way at the schema level (a request touching only
// one of the two fields doesn't carry the other's current value) — that
// case is checked in the PATCH route itself, against the merged existing
// + incoming values.
const discountBelowPrice = (data: { price: string; discountPrice?: string | null }) =>
  data.discountPrice === undefined || data.discountPrice === null || Number(data.discountPrice) < Number(data.price);

export const productCreateSchema = z
  .object({
    ...productBaseFields,
    stockAvailable: z.number().int().nonnegative().optional().default(0),
  })
  .refine(discountBelowPrice, { message: "Discount price must be less than the regular price.", path: ["discountPrice"] });
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** General edit: every catalog field except stock quantities (those only
 *  change through /stock, which always writes a StockMovement) and the
 *  marketing flags + SEO (those only change through /marketing). */
export const productUpdateSchema = z.object(productBaseFields).partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const marketingUpdateSchema = z
  .object({
    isFeatured: z.boolean(),
    isBestSeller: z.boolean(),
    isTrending: z.boolean(),
    isNewArrival: z.boolean(),
    seoTitle: z.string().trim().max(200).nullable(),
    seoDesc: z.string().trim().max(500).nullable(),
  })
  .partial();
export type MarketingUpdateInput = z.infer<typeof marketingUpdateSchema>;

export const stockAdjustmentSchema = z.object({
  change: z
    .number()
    .int()
    .refine((v) => v !== 0, "Adjustment must be non-zero."),
  reason: z.enum(["purchase", "restock", "damage", "lost", "correction", "return", "other"]),
  // Module 34: was max(500), but StockMovement.note is a plain `String?` in
  // schema.prisma — no @db.VarChar/@db.Text override — which Prisma maps to
  // VARCHAR(191) on MySQL. A note of 192-500 chars passed this validation
  // and then crashed adjustStock()'s write with an unhandled Prisma P2000
  // ("value too long for column"), a 500 for input the schema itself said
  // was valid. 191 matches the real column capacity exactly, zero schema
  // change needed.
  note: z.string().trim().max(191).nullable().optional(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

/** Dedicated shortcut for the well-known ProductAttribute rows (Material,
 *  Color, Width, Height, Care Instructions) — the same "flat columns over a
 *  free-form attribute table" pattern already used by bulk-edit and CSV
 *  import/export. Not real Product columns, so kept out of
 *  productCreateSchema/productUpdateSchema; parsed separately by the
 *  product create/update routes and written via upsertAttribute(). */
export const productDetailAttributesSchema = z
  .object({
    material: z.string().trim().max(500),
    color: z.string().trim().max(500),
    width: z.string().trim().max(500),
    height: z.string().trim().max(500),
    careInstructions: z.string().trim().max(2000),
  })
  .partial();
export type ProductDetailAttributesInput = z.infer<typeof productDetailAttributesSchema>;

const imagePurposeEnum = z.enum(["PRODUCT", "LIFESTYLE", "DETAIL"]);

export const imageCreateSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required.").max(1000),
  altText: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  purpose: imagePurposeEnum.optional(),
});
export type ImageCreateInput = z.infer<typeof imageCreateSchema>;

export const imageUpdateSchema = imageCreateSchema.partial();
export type ImageUpdateInput = z.infer<typeof imageUpdateSchema>;

export const imageReorderSchema = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number().int().nonnegative() })).min(1),
});
export type ImageReorderInput = z.infer<typeof imageReorderSchema>;

export const variantCreateSchema = z.object({
  name: z.string().trim().min(1, "Variant name is required.").max(150),
  sku: z.string().trim().min(1, "Variant SKU is required.").max(100),
  price: moneyField,
  stock: z.number().int().nonnegative().optional().default(0),
});
export type VariantCreateInput = z.infer<typeof variantCreateSchema>;

export const variantUpdateSchema = variantCreateSchema.partial();
export type VariantUpdateInput = z.infer<typeof variantUpdateSchema>;

export const attributeCreateSchema = z.object({
  label: z.string().trim().min(1, "Label is required.").max(150),
  value: z.string().trim().min(1, "Value is required.").max(500),
  sortOrder: z.number().int().nonnegative().optional(),
  isVisible: z.boolean().optional().default(true),
});
export type AttributeCreateInput = z.infer<typeof attributeCreateSchema>;

export const attributeUpdateSchema = attributeCreateSchema.partial();
export type AttributeUpdateInput = z.infer<typeof attributeUpdateSchema>;

export const attributeReorderSchema = z.object({
  order: z.array(z.object({ id: z.string(), sortOrder: z.number().int().nonnegative() })).min(1),
});
export type AttributeReorderInput = z.infer<typeof attributeReorderSchema>;
