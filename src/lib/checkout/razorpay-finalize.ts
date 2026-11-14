import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchRazorpayOrder } from "@/lib/providers/payment/razorpay";
import { decodeAttemptSnapshot } from "@/lib/checkout/razorpay-attempt";
import { validateCoupon } from "@/lib/cart/coupons";
import { computeOrderPricing } from "@/lib/checkout/pricing";
import { generateOrderNumber } from "@/lib/checkout/order-service";
import { recordOrderEvent } from "@/lib/checkout/order-events";
import { emit } from "@/lib/services/notifications";
import { notifyStockCrossing } from "@/lib/inventory/stock-service";
import type { CartLineItemDTO } from "@/lib/data/cart";

export interface FinalizeResult {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  userId?: string | null;
  /** true if this call found the order already finalized by the other path (webhook vs. verify race). */
  alreadyFinalized?: boolean;
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * The single idempotent finalize path shared by /api/payment/razorpay/verify
 * (fast path, browser-driven) and /api/payment/razorpay/webhook (authoritative,
 * Razorpay-server-driven) — Module 11 decision: both must run the exact same
 * logic, not two parallel implementations.
 *
 * Callers are responsible for their OWN signature verification first
 * (payment signature for /verify, webhook signature for /webhook — different
 * schemes, different secrets). This function then re-fetches the order
 * directly from Razorpay's API as the single source of truth for amount/
 * status — it never trusts anything the client or the webhook payload itself
 * claims about amount or status.
 *
 * Idempotency: the internal Order.id is deterministically derived from the
 * Razorpay order id, reusing Order's EXISTING primary-key uniqueness — no
 * schema change needed. A concurrent duplicate finalize (webhook arriving
 * while /verify is mid-flight, or a redelivered webhook) collides on that
 * primary key and is treated as "already finalized", not a duplicate order.
 */
export async function finalizeRazorpayPayment(razorpayOrderId: string, razorpayPaymentId: string): Promise<FinalizeResult> {
  const order = await fetchRazorpayOrder(razorpayOrderId);

  if (order.status !== "paid" || order.amountPaid < order.amount) {
    return { success: false, error: "Payment has not been completed." };
  }

  let snapshot;
  try {
    snapshot = decodeAttemptSnapshot(order.notes);
  } catch (err) {
    console.error("[razorpay-finalize] failed to decode order notes", razorpayOrderId, err);
    return { success: false, error: "Could not reconstruct this order's details." };
  }

  const deterministicOrderId = `rzp_${razorpayOrderId}`;

  // Reuses the exact pricing math the COD path already uses
  // (computeOrderPricing) against the snapshot's frozen item prices — not
  // live cart/product prices — since the snapshot is what was actually
  // charged. A shim CartLineItemDTO[] lets this call the real function
  // instead of re-implementing pricing math a second time.
  const shimItems: CartLineItemDTO[] = snapshot.items.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    product: {
      id: i.productId,
      name: i.name,
      slug: "",
      price: i.price,
      discountPrice: null,
      images: [],
      isNewArrival: false,
      isBestSeller: false,
    },
  }));

  const subtotal = shimItems.reduce((sum, i) => sum + parseFloat(i.product.price) * i.quantity, 0);
  let discountAmount = 0;
  let freeShipping = false;
  let appliedCoupon: { id: string; code: string } | null = null;
  if (snapshot.couponCode) {
    const result = await validateCoupon(snapshot.couponCode, subtotal);
    if (result.valid) {
      discountAmount = result.discountAmount ?? 0;
      freeShipping = result.freeShipping ?? false;
      const coupon = await prisma.coupon.findUnique({ where: { code: snapshot.couponCode.trim().toUpperCase() } });
      if (coupon) appliedCoupon = { id: coupon.id, code: coupon.code };
    }
  }

  const pricing = await computeOrderPricing(shimItems, { discountAmount, freeShipping, paymentMethod: "RAZORPAY" });
  const expectedPaise = Math.round(pricing.grandTotal * 100);

  // Integrity check on the notes round-trip, not a live-price re-validation
  // (see file header) — a mismatch here means the snapshot was corrupted or
  // tampered, not that prices simply changed after checkout.
  if (Math.abs(expectedPaise - order.amount) > 1) {
    console.error("[razorpay-finalize] amount mismatch", { razorpayOrderId, expectedPaise, chargedPaise: order.amount });
    return { success: false, error: "Payment amount could not be verified." };
  }

  const orderNumber = generateOrderNumber();

  try {
    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: deterministicOrderId,
          orderNumber,
          userId: snapshot.userId ?? null,
          customerName: snapshot.address.fullName,
          customerEmail: snapshot.email,
          customerPhone: snapshot.address.phone,
          shippingAddress: { ...snapshot.address },
          // Module 37: honors a genuinely different billing address captured
          // at create-order time; undefined (the default, pre-Module-37
          // shape) still means "same as shipping".
          billingAddress: { ...(snapshot.billingAddress ?? snapshot.address) },
          deliveryInstructions: snapshot.deliveryInstructions || null,
          giftMessage: snapshot.giftMessage || null,
          gstNumber: snapshot.gstNumber || null,
          companyName: snapshot.companyName || null,
          subtotal: pricing.subtotal,
          shippingCharge: pricing.shipping,
          taxAmount: pricing.taxAmount,
          discountAmount: pricing.discount,
          total: pricing.grandTotal,
          couponId: appliedCoupon?.id ?? null,
          paymentMethod: "RAZORPAY",
          items: {
            create: snapshot.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: parseFloat(i.price),
              quantity: i.quantity,
            })),
          },
        },
      });

      const stockCrossingChecks: { productId: string; previousStock: number; newStock: number; lowStockAt: number }[] = [];

      for (const item of snapshot.items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { stockAvailable: { decrement: item.quantity } },
          select: { stockAvailable: true, lowStockAt: true },
        });
        stockCrossingChecks.push({
          productId: item.productId,
          previousStock: updated.stockAvailable + item.quantity,
          newStock: updated.stockAvailable,
          lowStockAt: updated.lowStockAt,
        });
        // Payment was already captured by Razorpay before this ran — we
        // cannot refuse the order at this point without owing a refund
        // (out of Module 11's scope, and unchanged by Module 17: the WHEN
        // of this decrement is a preserved business rule, not something a
        // stock-consistency fix should alter). Logged loudly for manual
        // review, and the movement note is flagged too, so the oversell is
        // visible in inventory history, not just server logs.
        const oversold = updated.stockAvailable < 0;
        if (oversold) {
          console.error("[razorpay-finalize] stock went negative after a paid order", {
            productId: item.productId,
            orderNumber,
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            change: -item.quantity,
            reason: "order",
            note: oversold ? `Order ${orderNumber} (WARNING: oversold — paid order fulfilled below available stock)` : `Order ${orderNumber}`,
          },
        });
      }

      if (appliedCoupon) {
        await tx.coupon.update({ where: { id: appliedCoupon.id }, data: { usedCount: { increment: 1 } } });
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: "RAZORPAY",
          status: "PAID",
          razorpayOrderId,
          razorpayPaymentId,
          amount: pricing.grandTotal,
        },
      });

      // Webhook-safe: only touches the DB, no cookies needed. Guest cart
      // cookie clearing happens in the /verify route instead (see there).
      if (snapshot.userId) {
        await tx.cartItem.deleteMany({ where: { userId: snapshot.userId } });
      }

      return { order, stockCrossingChecks };
    });

    for (const check of created.stockCrossingChecks) {
      await notifyStockCrossing(check.productId, check.previousStock, check.newStock, check.lowStockAt);
    }

    await recordOrderEvent({ orderId: created.order.id, type: "order.created", data: { orderNumber, paymentMethod: "RAZORPAY" } });
    await emit("order.placed", {
      userId: snapshot.userId ?? null,
      orderId: created.order.id,
      email: snapshot.email,
      phone: snapshot.address.phone,
      name: snapshot.address.fullName,
      orderNumber,
      total: pricing.grandTotal,
    });

    return { success: true, orderId: created.order.id, orderNumber, userId: snapshot.userId ?? null, alreadyFinalized: false };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      const existing = await prisma.order.findUnique({ where: { id: deterministicOrderId } });
      if (existing) {
        return {
          success: true,
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          userId: existing.userId,
          alreadyFinalized: true,
        };
      }
    }
    console.error("[razorpay-finalize] failed to finalize order", razorpayOrderId, err);
    return { success: false, error: "Failed to finalize this order." };
  }
}

/**
 * Attempt-first design means a failed payment never creates an Order/Payment
 * row — the only durable trace of the attempt is the notes payload Razorpay
 * still has on its own order object, so that's re-fetched here the same way
 * finalizeRazorpayPayment() does, purely to recover who to notify.
 *
 * Dedup: no Order.id exists to hang a unique-constraint idempotency guard
 * off (the mechanism finalizeRazorpayPayment() uses), since nothing durable
 * is created here. Instead, this checks whether a "payment.failed"
 * Notification already exists for this exact razorpayOrderId before
 * emitting — covers both a redelivered webhook and a customer retrying
 * against the same attempt. Scoped across all recipients (not just the
 * customer) so the admin fan-out doesn't duplicate either.
 */
export async function handleRazorpayPaymentFailed(razorpayOrderId: string): Promise<void> {
  try {
    const alreadyNotified = await prisma.notification.findFirst({
      where: { type: "payment.failed", metadata: { path: "$.razorpayOrderId", equals: razorpayOrderId } },
    });
    if (alreadyNotified) return;

    const order = await fetchRazorpayOrder(razorpayOrderId);
    const snapshot = decodeAttemptSnapshot(order.notes);

    await emit("payment.failed", {
      userId: snapshot.userId ?? null,
      email: snapshot.email,
      phone: snapshot.address.phone,
      name: snapshot.address.fullName,
      razorpayOrderId,
    });
  } catch (err) {
    console.error("[razorpay-finalize] failed to handle payment.failed", razorpayOrderId, err);
  }
}
