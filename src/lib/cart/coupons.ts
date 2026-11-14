import "server-only";
import { prisma } from "@/lib/prisma";

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  freeShipping?: boolean;
  code?: string;
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });

  if (!coupon || !coupon.isActive) {
    return { valid: false, error: "This coupon code is invalid." };
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) {
    return { valid: false, error: "This coupon isn't active yet." };
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    return { valid: false, error: "This coupon has expired." };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: "This coupon has reached its usage limit." };
  }

  const minPurchase = coupon.minPurchase ? parseFloat(coupon.minPurchase.toString()) : 0;
  if (subtotal < minPurchase) {
    return { valid: false, error: `Add items worth ₹${(minPurchase - subtotal).toFixed(0)} more to use this coupon.` };
  }

  const value = parseFloat(coupon.value.toString());

  if (coupon.type === "PERCENTAGE") {
    const discountAmount = Math.min((subtotal * value) / 100, subtotal);
    return { valid: true, discountAmount, code: coupon.code };
  }

  if (coupon.type === "FLAT") {
    const discountAmount = Math.min(value, subtotal);
    return { valid: true, discountAmount, code: coupon.code };
  }

  if (coupon.type === "FREE_SHIPPING") {
    return { valid: true, discountAmount: 0, freeShipping: true, code: coupon.code };
  }

  // BUY_X_GET_Y needs rule complexity (which product, how many, what's free)
  // beyond a subtotal-level discount — deferred rather than half-implemented.
  return { valid: false, error: "This coupon type isn't supported yet." };
}
