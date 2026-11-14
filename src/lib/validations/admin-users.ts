import { z } from "zod";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "INVENTORY_STAFF", "ORDER_MANAGER", "SUPPORT_STAFF", "MARKETING_STAFF"] as const;

export const createStaffUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  phone: z.string().trim().max(20).optional(),
  role: z.enum(STAFF_ROLES),
});
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const setStaffBlockedSchema = z.object({ isBlocked: z.boolean() });

export const resetStaffPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
});
