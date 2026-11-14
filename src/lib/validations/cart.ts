import { z } from "zod";
import { MAX_QUANTITY_PER_ITEM, COUPON_CODE_MAX_LENGTH } from "@/lib/config/cart";

export const addToCartSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_QUANTITY_PER_ITEM),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCouponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(COUPON_CODE_MAX_LENGTH),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
