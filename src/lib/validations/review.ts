import { z } from "zod";

const rating = z
  .number({ invalid_type_error: "Rating must be a number" })
  .int("Rating must be a whole number")
  .min(1, "Rating must be between 1 and 5")
  .max(5, "Rating must be between 1 and 5");

const title = z.string().trim().max(120, "Title is too long").optional();
const comment = z.string().trim().max(2000, "Review is too long").optional();

export const createReviewSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  rating,
  title,
  comment,
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const adminReviewUpdateSchema = z.object({
  isApproved: z.boolean(),
});
export type AdminReviewUpdateInput = z.infer<typeof adminReviewUpdateSchema>;

export const reviewsSettingSchema = z.object({
  enabled: z.boolean(),
});
export type ReviewsSettingInput = z.infer<typeof reviewsSettingSchema>;

export const productReviewsToggleSchema = z.object({
  enabled: z.boolean(),
});
export type ProductReviewsToggleInput = z.infer<typeof productReviewsToggleSchema>;
