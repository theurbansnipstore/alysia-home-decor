import { z } from "zod";

const statusEnum = z.enum(["DRAFT", "PUBLISHED"]);

export const pageBaseFields = {
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, hyphen-separated."),
  content: z.string().trim().min(1, "Content is required."),
  excerpt: z.string().trim().max(500).nullable().optional(),
  status: statusEnum.optional(),
  // Same limits as Product's marketingUpdateSchema (src/lib/validations/product.ts)
  // — one SEO field-length rule for the whole app, not a second copy.
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDesc: z.string().trim().max(500).nullable().optional(),
};

export const pageCreateSchema = z.object(pageBaseFields);
export type PageCreateInput = z.infer<typeof pageCreateSchema>;

export const pageUpdateSchema = z.object(pageBaseFields).partial();
export type PageUpdateInput = z.infer<typeof pageUpdateSchema>;
