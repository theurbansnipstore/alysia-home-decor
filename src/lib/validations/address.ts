import { z } from "zod";

export const addressSchema = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(1, "Full name is required.").max(100),
  phone: z.string().trim().min(1, "Mobile number is required.").regex(/^\d+$/, "Mobile number must contain exactly 10 digits."),
  line1: z.string().trim().min(1, "House number is required.").max(200),
  line2: z.string().trim().min(1, "Floor / Landmark is required.").max(200),
  city: z.string().trim().min(1, "City is required.").max(100),
  state: z.string().trim().min(1, "State is required.").max(100),
  pincode: z.string().trim().min(1, "Pincode is required.").regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
  country: z.string().trim().min(2).default("India"),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;
