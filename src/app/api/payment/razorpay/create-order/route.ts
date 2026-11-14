import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCurrentCart } from "@/lib/cart/service";
import { validateCoupon } from "@/lib/cart/coupons";
import { computeOrderPricing } from "@/lib/checkout/pricing";
import { addressToSnapshot } from "@/lib/checkout/snapshot";
import { getAddressById } from "@/lib/data/addresses";
import { createRazorpayOrder } from "@/lib/providers/payment/razorpay";
import { encodeAttemptSnapshot, type RazorpayAttemptSnapshot } from "@/lib/checkout/razorpay-attempt";
import { createRazorpayOrderSchema } from "@/lib/validations/payment";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getCheckoutSettings } from "@/lib/settings/checkout";

function generateReceipt(): string {
  return `att_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 40);
}

/**
 * Attempt-first Razorpay order creation (Module 11 decision): does NOT
 * create a Kutir Order/Payment row and does NOT touch stockAvailable —
 * those only happen at finalize (razorpay-finalize.ts), after payment is
 * actually verified. This route only pre-checks stock (read-only, same
 * courtesy check order-service.ts's placeOrder() does) and computes the
 * amount to charge, server-side, from the live cart — never from anything
 * the client submits.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = createRazorpayOrderSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return apiError(firstIssue?.message || "Please check the form and try again", 400, parsed.error.flatten().fieldErrors);
    }
    const input = parsed.data;

    const items = await getCurrentCart();
    if (items.length === 0) {
      return apiError("Your cart is empty.", 400);
    }

    let shippingAddress;
    if (input.savedAddressId) {
      if (!session) return apiError("You must be signed in to use a saved address.", 401);
      const saved = await getAddressById(session.id, input.savedAddressId);
      if (!saved) return apiError("That saved address could not be found.", 404);
      shippingAddress = addressToSnapshot(saved);
    } else if (input.shippingAddress) {
      shippingAddress = input.shippingAddress;
    } else {
      return apiError("A shipping address is required.", 400);
    }

    // Module 43: same server-wide authority as the COD path
    // (order-service.ts) — when allowDifferentBillingAddress is OFF, a
    // manipulated request claiming "different billing" is silently ignored
    // (billing stays "same as shipping", not a 400) rather than trusted.
    // When ON, billing is still never compulsory, but a customer who
    // explicitly chose "different billing" must actually supply one.
    const checkoutSettings = await getCheckoutSettings();
    const wantsDifferentBilling = checkoutSettings.allowDifferentBillingAddress && input.billingSameAsShipping === false;
    if (wantsDifferentBilling && !input.billingAddress) {
      return apiError('Please provide a billing address, or choose "same as shipping".', 400);
    }

    // Read-only courtesy check — the authoritative decrement + guard against
    // overselling happens at finalize, inside a transaction.
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { stockAvailable: true } });
      if (!product || product.stockAvailable < item.quantity) {
        return apiError(`"${item.product.name}" doesn't have enough stock available.`, 400);
      }
    }

    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.product.discountPrice || i.product.price) * i.quantity, 0);
    let discountAmount = 0;
    let freeShipping = false;
    if (input.couponCode) {
      const result = await validateCoupon(input.couponCode, subtotal);
      if (!result.valid) {
        return apiError(result.error || "This coupon is no longer valid.", 400);
      }
      discountAmount = result.discountAmount ?? 0;
      freeShipping = result.freeShipping ?? false;
    }

    const pricing = await computeOrderPricing(items, { discountAmount, freeShipping, paymentMethod: "RAZORPAY" });
    const amountPaise = Math.round(pricing.grandTotal * 100);
    if (amountPaise <= 0) {
      return apiError("Order total must be greater than zero.", 400);
    }

    const snapshot: RazorpayAttemptSnapshot = {
      email: input.email,
      userId: session?.id,
      address: shippingAddress,
      billingAddress: wantsDifferentBilling ? input.billingAddress : undefined,
      deliveryInstructions: input.deliveryInstructions,
      giftMessage: input.giftMessage,
      gstNumber: input.gstNumber,
      companyName: input.companyName,
      couponCode: input.couponCode,
      items: items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.product.discountPrice || i.product.price,
        name: i.product.name,
      })),
    };

    const encoded = encodeAttemptSnapshot(snapshot);
    if (!encoded.ok) {
      return apiError(encoded.error, 400);
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise,
      receipt: generateReceipt(),
      notes: encoded.notes,
    });

    return apiSuccess({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("[POST /api/payment/razorpay/create-order]", err);
    return apiError("Could not start payment. Please try again.", 500);
  }
}
