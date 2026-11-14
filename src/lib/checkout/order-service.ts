import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCurrentCart, clearCurrentCart } from "@/lib/cart/service";
import { validateCoupon } from "@/lib/cart/coupons";
import { getAppliedCouponCode, clearAppliedCouponCode } from "@/lib/cart/coupon-cookie";
import { computeOrderPricing } from "@/lib/checkout/pricing";
import { addressToSnapshot, type AddressSnapshot } from "@/lib/checkout/snapshot";
import { getAddressById } from "@/lib/data/addresses";
import { codPaymentProvider } from "@/lib/providers/payment/cod";
import { recordOrderEvent } from "@/lib/checkout/order-events";
import { emit } from "@/lib/services/notifications";
import { notifyStockCrossing } from "@/lib/inventory/stock-service";
import type { PlaceOrderInput } from "@/lib/validations/checkout";
import { saveCheckoutAddressIfNew } from "@/lib/checkout/save-checkout-address";
import { getCheckoutSettings } from "@/lib/settings/checkout";

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KTR-${timestamp}-${random}`;
}

export interface PlaceOrderResult {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

/** Thrown inside the order transaction when the guarded stock decrement
 *  finds insufficient stock at commit time — rolls back the whole order
 *  (no partial order, no partial decrement), then caught outside and turned
 *  into the same user-facing message the pre-check below already uses. */
class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`INSUFFICIENT_STOCK: ${productName}`);
  }
}

/**
 * The single order-placement implementation for both guest and logged-in
 * checkout — getSession() inside just determines whether userId is set on
 * the resulting Order and whether a saved address can be used. No
 * duplicate "guest" vs "member" checkout logic exists anywhere.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const session = await getSession();

  const items = await getCurrentCart();
  if (items.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  // Server-side COD-risk enforcement (Module 21) — never trust the client's
  // choice of paymentMethod alone. Re-read fresh from the DB rather than
  // anything on the JWT session, since codBlocked can change after the
  // token was issued and the session is otherwise stateless. Guest
  // checkout (no session) is never restricted — there's no stable identity
  // to check against, and guest behavior is explicitly unchanged.
  if (input.paymentMethod === "COD" && session) {
    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { codBlocked: true } });
    if (user?.codBlocked) {
      return { success: false, error: "Cash on Delivery isn't currently available for this account. Please use online payment." };
    }
  }

  let shippingAddress: AddressSnapshot;
  if (input.savedAddressId) {
    if (!session) {
      return { success: false, error: "You must be signed in to use a saved address." };
    }
    const saved = await getAddressById(session.id, input.savedAddressId);
    if (!saved) {
      return { success: false, error: "That saved address could not be found." };
    }
    shippingAddress = addressToSnapshot(saved);
  } else if (input.shippingAddress) {
    shippingAddress = input.shippingAddress;
  } else {
    return { success: false, error: "A shipping address is required." };
  }

  // Module 43: allowDifferentBillingAddress is the store-wide authority —
  // when OFF, a manipulated request claiming "different billing" is
  // silently ignored server-side (never a 400; the order still places
  // normally, just with billing forced to shipping), so a client can't
  // bypass the store's own configuration by sending the flag anyway. When
  // ON, the Module 38 Part 5 behavior is unchanged: billing is still never
  // compulsory, but a customer who explicitly chose "different billing"
  // must actually supply one.
  const checkoutSettings = await getCheckoutSettings();
  const wantsDifferentBilling = checkoutSettings.allowDifferentBillingAddress && input.billingSameAsShipping === false;

  if (wantsDifferentBilling && !input.billingAddress) {
    return { success: false, error: "Please provide a billing address, or choose \"same as shipping\"." };
  }

  const billingAddress: AddressSnapshot = wantsDifferentBilling && input.billingAddress ? input.billingAddress : shippingAddress;

  const subtotalForCoupon = items.reduce(
    (sum, i) => sum + parseFloat(i.product.discountPrice || i.product.price) * i.quantity,
    0
  );
  const couponCode = getAppliedCouponCode();
  let discountAmount = 0;
  let freeShipping = false;
  let appliedCoupon: { id: string; code: string } | null = null;

  if (couponCode) {
    const result = await validateCoupon(couponCode, subtotalForCoupon);
    if (result.valid) {
      discountAmount = result.discountAmount ?? 0;
      freeShipping = result.freeShipping ?? false;
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
      if (coupon) appliedCoupon = { id: coupon.id, code: coupon.code };
    }
  }

  const pricing = await computeOrderPricing(items, { discountAmount, freeShipping, paymentMethod: input.paymentMethod });

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stockAvailable: true },
    });
    if (!product || product.stockAvailable < item.quantity) {
      return { success: false, error: `"${item.product.name}" doesn't have enough stock available.` };
    }
  }

  const orderNumber = generateOrderNumber();

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: session?.id ?? null,
          customerName: shippingAddress.fullName,
          customerEmail: input.email,
          customerPhone: shippingAddress.phone,
          shippingAddress: { ...shippingAddress },
          billingAddress: { ...billingAddress },
          deliveryInstructions: input.deliveryInstructions || null,
          giftMessage: input.giftMessage || null,
          gstNumber: input.gstNumber || null,
          companyName: input.companyName || null,
          subtotal: pricing.subtotal,
          shippingCharge: pricing.shipping,
          taxAmount: pricing.taxAmount,
          discountAmount: pricing.discount,
          total: pricing.grandTotal,
          couponId: appliedCoupon?.id ?? null,
          paymentMethod: input.paymentMethod,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              name: item.product.name,
              price: parseFloat(item.product.discountPrice || item.product.price),
              quantity: item.quantity,
            })),
          },
        },
      });

      const stockCrossingChecks: { productId: string; previousStock: number; newStock: number; lowStockAt: number }[] = [];

      for (const item of items) {
        // Guarded atomic decrement (not a plain update): the WHERE clause's
        // stockAvailable >= quantity is checked and applied in one statement,
        // so two concurrent orders racing for the same product's last few
        // units can't both succeed and drive stock negative — whichever
        // transaction's UPDATE commits first wins, and the second one's
        // guard fails, matching count 0 below, exactly like the pre-check
        // above but race-proof instead of just a courtesy check.
        const decremented = await tx.product.updateMany({
          where: { id: item.productId, stockAvailable: { gte: item.quantity } },
          data: { stockAvailable: { decrement: item.quantity } },
        });
        if (decremented.count === 0) {
          throw new InsufficientStockError(item.product.name);
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: -item.quantity,
            reason: "order",
            note: `Order ${orderNumber}`,
          },
        });

        // previousStock derived exactly from the known decrement amount
        // (newStock + quantity) rather than a separate "before" read, so
        // this can't be skewed by a concurrent write between two queries.
        const after = await tx.product.findUnique({ where: { id: item.productId }, select: { stockAvailable: true, lowStockAt: true } });
        if (after) {
          stockCrossingChecks.push({
            productId: item.productId,
            previousStock: after.stockAvailable + item.quantity,
            newStock: after.stockAvailable,
            lowStockAt: after.lowStockAt,
          });
        }
      }

      if (appliedCoupon) {
        await tx.coupon.update({ where: { id: appliedCoupon.id }, data: { usedCount: { increment: 1 } } });
      }

      const paymentResult = await codPaymentProvider.initiate({ orderId: created.id, amount: pricing.grandTotal });
      await tx.payment.create({
        data: {
          orderId: created.id,
          method: input.paymentMethod,
          status: paymentResult.status,
          amount: pricing.grandTotal,
        },
      });

      return { order: created, stockCrossingChecks };
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { success: false, error: `"${err.productName}" doesn't have enough stock available.` };
    }
    throw err;
  }

  const { order, stockCrossingChecks } = result;

  // Best-effort, outside the transaction — never lets a notification
  // failure roll back an already-committed order.
  for (const check of stockCrossingChecks) {
    await notifyStockCrossing(check.productId, check.previousStock, check.newStock, check.lowStockAt);
  }

  await recordOrderEvent({ orderId: order.id, type: "order.created", data: { orderNumber } });
  await clearAppliedCouponCode();
  await clearCurrentCart();

  if (session && !input.savedAddressId) {
  await saveCheckoutAddressIfNew(session.id, shippingAddress);
}

  await emit("order.placed", {
    userId: session?.id ?? null,
    orderId: order.id,
    email: input.email,
    phone: shippingAddress.phone,
    name: shippingAddress.fullName,
    orderNumber,
    total: pricing.grandTotal,
  });

  return { success: true, orderId: order.id, orderNumber };
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
}
