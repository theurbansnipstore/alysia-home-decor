import "server-only";
import { cookies } from "next/headers";

const COUPON_COOKIE_NAME = "kutir_cart_coupon";
const COUPON_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getAppliedCouponCode(): string | null {
  return cookies().get(COUPON_COOKIE_NAME)?.value ?? null;
}

export function setAppliedCouponCode(code: string): void {
  cookies().set(COUPON_COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COUPON_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAppliedCouponCode(): void {
  cookies().set(COUPON_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
