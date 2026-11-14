import { z } from "zod";
import { addressInputSchema } from "@/lib/validations/checkout";

/**
 * Input for POST /api/payment/razorpay/create-order. Deliberately separate
 * from placeOrderSchema (checkout.ts) rather than widening its
 * paymentMethod literal — keeps the existing COD path (/api/checkout,
 * order-service.ts) completely untouched.
 *
 * Module 37/38: billingAddress/billingSameAsShipping added, mirroring
 * placeOrderSchema — every customer can always choose a distinct billing
 * address at checkout (default: same as shipping), never gated by a store
 * setting. Carried through the Razorpay notes payload only when actually
 * present (see razorpay-attempt.ts) — a customer who keeps the default
 * "same as shipping" has an attempt snapshot unchanged in size and shape.
 */
export const createRazorpayOrderSchema = z
  .object({
    email: z.string().trim().toLowerCase().min(1, "Email is required.").email("Please enter a valid email address."),
    savedAddressId: z.string().optional(),
    shippingAddress: addressInputSchema.optional(),
    billingAddress: addressInputSchema.optional(),
    billingSameAsShipping: z.boolean().optional().default(true),
    deliveryInstructions: z.string().trim().max(300).optional(),
    giftMessage: z.string().trim().max(300).optional(),
    companyName: z.string().trim().max(150).optional(),
    gstNumber: z.string().trim().max(30).optional(),
    couponCode: z.string().trim().optional(),
  })
  .refine((data) => data.savedAddressId || data.shippingAddress, {
    message: "Please enter a shipping address.",
    path: ["shippingAddress"],
  });
export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;

/** Body the browser posts to /verify after Razorpay Checkout.js's success handler fires. */
export const verifyRazorpaySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
export type VerifyRazorpayInput = z.infer<typeof verifyRazorpaySchema>;
