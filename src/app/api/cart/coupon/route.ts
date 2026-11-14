import { NextRequest } from "next/server";
import { applyCoupon, removeCoupon } from "@/lib/cart/service";
import { applyCouponSchema } from "@/lib/validations/cart";
import { apiSuccess, apiError } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiError("Invalid request body", 400);

    const parsed = applyCouponSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const snapshot = await applyCoupon(parsed.data.code);
    if (snapshot.couponError) {
      return apiError(snapshot.couponError, 400);
    }
    return apiSuccess(snapshot);
  } catch (err) {
    console.error("[POST /api/cart/coupon]", err);
    return apiError("Failed to apply coupon", 500);
  }
}

export async function DELETE() {
  try {
    const snapshot = await removeCoupon();
    return apiSuccess(snapshot);
  } catch (err) {
    console.error("[DELETE /api/cart/coupon]", err);
    return apiError("Failed to remove coupon", 500);
  }
}
