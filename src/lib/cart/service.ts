import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toProductCardDTO } from "@/lib/data/products";
import { getDbCart, addToDbCart, setDbCartItemQuantity, removeFromDbCart, type CartLineItemDTO } from "@/lib/data/cart";
import { getGuestCart, addToGuestCart, updateGuestCartItem, removeFromGuestCart, clearGuestCart } from "@/lib/cart/guest-cart";
import { getAppliedCouponCode, setAppliedCouponCode, clearAppliedCouponCode } from "@/lib/cart/coupon-cookie";
import { validateCoupon } from "@/lib/cart/coupons";
import { computeCartTotals, type CartTotals } from "@/lib/cart/pricing";
import { getShippingSettings } from "@/lib/settings/shipping";

async function hydrateGuestCart(items: { productId: string; quantity: number }[]): Promise<CartLineItemDTO[]> {
  if (items.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: "ACTIVE" },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return items
    .filter((i) => byId.has(i.productId))
    .map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      product: toProductCardDTO(byId.get(i.productId)!),
    }));
}

/** The current cart, guest or logged-in, as a flat line-item list. */
export async function getCurrentCart(): Promise<CartLineItemDTO[]> {
  const session = await getSession();
  if (session) return getDbCart(session.id);
  return hydrateGuestCart(await getGuestCart());
}

export async function addToCart(productId: string, quantity: number): Promise<void> {
  const session = await getSession();
  if (session) await addToDbCart(session.id, productId, quantity);
  else await addToGuestCart(productId, quantity);
}

export async function updateCartItem(productId: string, quantity: number): Promise<void> {
  const session = await getSession();
  if (session) await setDbCartItemQuantity(session.id, productId, quantity);
  else await updateGuestCartItem(productId, quantity);
}

export async function removeCartItem(productId: string): Promise<void> {
  const session = await getSession();
  if (session) await removeFromDbCart(session.id, productId);
  else await removeFromGuestCart(productId);
}

export async function getCartCount(): Promise<number> {
  const items = await getCurrentCart();
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Empties the current cart (guest or logged-in) after a successful order placement. */
export async function clearCurrentCart(): Promise<void> {
  const session = await getSession();
  if (session) {
    await prisma.cartItem.deleteMany({ where: { userId: session.id } });
  } else {
    await clearGuestCart();
  }
}

export interface CartSnapshot {
  items: CartLineItemDTO[];
  totals: CartTotals;
  appliedCoupon: string | null;
  couponError: string | null;
}

/**
 * The full cart view: items, computed totals, and applied-coupon state
 * (re-validated against the live Coupon table on every call — the coupon
 * cookie only ever stores the code, never a trusted discount amount).
 * Used by both /cart (page render) and every /api/cart* route, so the
 * shape returned to the client is always identical regardless of which
 * action triggered it.
 */
export async function buildCartSnapshot(): Promise<CartSnapshot> {
  const items = await getCurrentCart();
  const couponCode = getAppliedCouponCode();

  let discountAmount = 0;
  let freeShipping = false;
  let couponError: string | null = null;

  if (couponCode) {
    const subtotal = items.reduce(
      (sum, i) => sum + parseFloat(i.product.discountPrice || i.product.price) * i.quantity,
      0
    );
    const result = await validateCoupon(couponCode, subtotal);
    if (result.valid) {
      discountAmount = result.discountAmount ?? 0;
      freeShipping = result.freeShipping ?? false;
    } else {
      couponError = result.error ?? "This coupon is no longer valid.";
    }
  }

  const shippingSettings = await getShippingSettings();
  const totals = computeCartTotals(items, {
    discountAmount,
    freeShipping,
    freeShippingEnabled: shippingSettings.freeShippingEnabled,
    freeShippingThreshold: shippingSettings.freeShippingThreshold,
  });

  return {
    items,
    totals,
    appliedCoupon: couponCode && !couponError ? couponCode : null,
    couponError,
  };
}

export async function applyCoupon(code: string): Promise<CartSnapshot> {
  setAppliedCouponCode(code.trim());
  return buildCartSnapshot();
}

export async function removeCoupon(): Promise<CartSnapshot> {
  clearAppliedCouponCode();
  return buildCartSnapshot();
}
