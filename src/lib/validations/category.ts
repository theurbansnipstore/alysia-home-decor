import { z } from "zod";

/**
 * Narrow, SEO-only category edit (Module 31 Part 9) — deliberately the
 * only category field this module lets an admin change. Category has no
 * admin CRUD at all today (name/slug/parent/sortOrder/visibility/image are
 * seed-managed) — building that is out of this module's scope, so this
 * schema stays limited to exactly the two existing DB columns
 * (Category.seoTitle/seoDesc) it's meant to expose. Same length limits as
 * marketingUpdateSchema's product seoTitle/seoDesc, for consistency.
 */
export const categorySeoUpdateSchema = z
  .object({
    seoTitle: z.string().trim().max(200).nullable(),
    seoDesc: z.string().trim().max(500).nullable(),
  })
  .partial();
export type CategorySeoUpdateInput = z.infer<typeof categorySeoUpdateSchema>;
