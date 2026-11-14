import { NextRequest } from "next/server";
import { verifyPaymentSignature } from "@/lib/providers/payment/razorpay";
import { finalizeRazorpayPayment } from "@/lib/checkout/razorpay-finalize";
import { verifyRazorpaySchema } from "@/lib/validations/payment";
import { clearCurrentCart } from "@/lib/cart/service";
import { clearAppliedCouponCode } from "@/lib/cart/coupon-cookie";
import { apiSuccess, apiError } from "@/lib/api-response";

/**
 * Fast path only (Module 11 design) — proves the browser callback wasn't
 * tampered with, then defers to the SAME finalize logic the webhook uses.
 * The webhook remains authoritative: if it already finalized this payment
 * (raced ahead of this request), finalizeRazorpayPayment() returns the
 * existing order instead of erroring or duplicating it.
 *
 * Cart clearing: only this route (not the webhook, which has no cookies)
 * clears the guest cart cookie. For logged-in users, finalize() already
 * cleared their DB cart inside its own transaction — calling
 * clearCurrentCart() again here is a harmless no-op for them.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = verifyRazorpaySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid payment verification request", 400, parsed.error.flatten().fieldErrors);
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const signatureValid = verifyPaymentSignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
    if (!signatureValid) {
      console.error("[POST /api/payment/razorpay/verify] signature mismatch", { razorpay_order_id });
      return apiError("Payment could not be verified.", 400);
    }

    const result = await finalizeRazorpayPayment(razorpay_order_id, razorpay_payment_id);
    if (!result.success) {
      return apiError(result.error || "Payment could not be finalized.", 400);
    }

    await clearAppliedCouponCode();
    await clearCurrentCart();

    return apiSuccess({ orderId: result.orderId, orderNumber: result.orderNumber });
  } catch (err) {
    console.error("[POST /api/payment/razorpay/verify]", err);
    return apiError("Payment verification failed. Please try again.", 500);
  }
}
