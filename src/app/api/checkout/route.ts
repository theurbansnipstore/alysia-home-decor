import { NextRequest } from "next/server";
import { placeOrder } from "@/lib/checkout/order-service";
import { placeOrderSchema } from "@/lib/validations/checkout";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
      // Client-side validation (CheckoutForm) should catch virtually all of
      // these before submission — this is the fallback path (JS disabled,
      // tampered request, etc.). Surface the first real issue instead of a
      // generic "Invalid input" even here.
      const firstIssue = parsed.error.issues[0];
      return apiError(
        firstIssue?.message || "Please check the form and try again",
        400,
        parsed.error.flatten().fieldErrors
      );
    }

    const result = await placeOrder(parsed.data);
    if (!result.success) {
      return apiError(result.error || "Could not place order", 400);
    }

    return apiSuccess({ orderId: result.orderId, orderNumber: result.orderNumber }, 201);
  } catch (err) {
    console.error("[POST /api/checkout]", err);
    return apiError("Failed to place order. Please try again.", 500);
  }
}
