import { z } from "zod";
import { getCountryByCode } from "@/lib/config/countries";

/**
 * Client-facing form schema — one field per UI input, so every field gets
 * its own specific error message (never a generic "Invalid input").
 * House No/Building + Floor/Landmark + Area/Locality are three separate
 * inputs here for UX clarity; CheckoutForm combines them into the
 * existing line1/line2 shape (see addressInputSchema below) only when
 * building the actual submission payload — the server-side snapshot
 * shape and the Address/Order schema are completely unchanged.
 */
export const addressFormSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required.").max(100),
    countryCode: z.string().trim().length(2),
    phone: z
      .string()
      .trim()
      .min(1, "Mobile number is required.")
      .regex(/^\d+$/, "Mobile number must contain exactly 10 digits."),
    houseNo: z.string().trim().min(1, "House number is required.").max(100),
    floorLandmark: z.string().trim().min(1, "Floor / Landmark is required.").max(100),
    areaLocality: z.string().trim().min(1, "Area / Locality is required.").max(100),
    city: z.string().trim().min(1, "City is required.").max(100),
    state: z.string().trim().min(1, "State is required.").max(100),
    pincode: z
      .string()
      .trim()
      .min(1, "Pincode is required.")
      .regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
    country: z.string().trim().min(1),
  })
  .superRefine((data, ctx) => {
    const country = getCountryByCode(data.countryCode);
    if (country && data.phone.length === country.phoneDigits && !country.phonePattern.test(data.phone)) {
      // Right length, wrong format (e.g. doesn't start with 6-9 for India)
      // — a distinct message from the length check above, matching the
      // two separate examples requested.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid Indian mobile number.",
        path: ["phone"],
      });
    } else if (country && data.phone.length !== country.phoneDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Mobile number must contain exactly ${country.phoneDigits} digits.`,
        path: ["phone"],
      });
    }
  });
export type AddressFormValue = z.infer<typeof addressFormSchema>;

/**
 * Server-facing shape — unchanged from before this batch: line1/line2,
 * not the three-way split above. This is what actually gets validated by
 * /api/checkout and stored in the Order snapshot. CheckoutForm is
 * responsible for combining the form's three fields into this shape
 * before submission.
 */
export const addressInputSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required.").max(100),
  countryCode: z.string().trim().length(2),
  phone: z.string().trim().regex(/^\d+$/),
  line1: z.string().trim().min(1, "Address is required.").max(200),
  line2: z.string().trim().min(1, "Address is required.").max(200),
  city: z.string().trim().min(1, "City is required.").max(100),
  state: z.string().trim().min(1, "State is required.").max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be exactly 6 digits."),
  country: z.string().trim().min(1),
});
export type AddressInputValue = z.infer<typeof addressInputSchema>;

export const placeOrderSchema = z
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
    paymentMethod: z.literal("COD", { message: "Please choose a payment method." }),
  })
  .refine((data) => data.savedAddressId || data.shippingAddress, {
    message: "Please enter a shipping address.",
    path: ["shippingAddress"],
  });
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
