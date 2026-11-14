import "server-only";
import { on, emit } from "@/lib/services/notifications/events";
import { getEmailProvider, getWhatsAppProvider } from "@/lib/services/notifications/providers";
import { createNotificationsForRoles } from "@/lib/services/notifications/service";
import { NEW_ORDER_NOTIFICATION_ROLES, LOW_STOCK_NOTIFICATION_ROLES } from "@/lib/admin/notification-roles";
import type { NotificationEventType } from "@/lib/services/notifications/types";

// Registers today's stub providers as listeners, resolved through
// getEmailProvider()/getWhatsAppProvider() (providers/index.ts, Module 23) —
// a real email/WhatsApp integration later means implementing a new
// NotificationChannelProvider and wiring it into that factory by
// EMAIL_PROVIDER/WHATSAPP_PROVIDER, not touching this event-wiring file. Per
// the approved architecture, checkout/order/inventory code only ever calls
// emit(); it never imports a provider or createNotificationsForRoles directly.
//
// Module 19 decision: customers receive email + WhatsApp only (no in-app
// row) — the in-app Notification table now exists purely for admin/staff
// operational alerts (new order, payment failed, low/out of stock), fanned
// out via createNotificationsForRoles(). See the final report for the full
// rationale; the customer-facing bell/list UI and its API routes were
// removed in this module.

interface OrderEventPayload {
  userId: string | null;
  orderId: string;
  email: string;
  phone?: string;
  name: string;
  orderNumber: string;
  courierName?: string | null;
  trackingNumber?: string | null;
}

on("user.registered", async (payload) => {
  const { email, phone, name } = payload as { userId?: string | null; email: string; phone?: string; name: string };
  await getEmailProvider().send({ channel: "email", eventType: "user.registered", template: "welcome", to: { email }, data: { name } });
  if (phone) {
    await getWhatsAppProvider().send({ channel: "whatsapp", eventType: "user.registered", template: "welcome", to: { phone }, data: { name } });
  }
});

on("order.placed", async (payload) => {
  const p = payload as unknown as OrderEventPayload & { total: number };
  await getEmailProvider().send({
    channel: "email",
    eventType: "order.placed",
    template: "order_placed",
    to: { email: p.email },
    data: { name: p.name, orderNumber: p.orderNumber, total: p.total },
  });
  if (p.phone) {
    await getWhatsAppProvider().send({
      channel: "whatsapp",
      eventType: "order.placed",
      template: "order_placed",
      to: { phone: p.phone },
      data: { name: p.name, orderNumber: p.orderNumber, total: p.total },
    });
  }

  await createNotificationsForRoles({
    roles: NEW_ORDER_NOTIFICATION_ROLES,
    type: "order.placed",
    title: "New order",
    message: `Order ${p.orderNumber} was just placed (₹${p.total.toLocaleString("en-IN")}).`,
    link: `/admin/orders/${p.orderId}`,
    metadata: { orderId: p.orderId, orderNumber: p.orderNumber },
    excludeUserId: p.userId ?? undefined,
  });
});

const STATUS_COPY: Record<string, { template: string }> = {
  "order.confirmed": { template: "order_confirmed" },
  "order.packed": { template: "order_packed" },
  "order.shipped": { template: "order_shipped" },
  "order.out_for_delivery": { template: "order_out_for_delivery" },
  "order.delivered": { template: "order_delivered" },
  "order.cancelled": { template: "order_cancelled" },
  "order.returned": { template: "order_returned" },
};

// Courier/tracking are only included for the two events where they're
// actually meaningful (Module 24 Part 10) — by SHIPPED, both fields are
// expected to be set (though not enforced, see status-service.ts); for
// every other status they'd just be null noise in the template.
const SHIPMENT_AWARE_EVENTS = new Set<NotificationEventType>(["order.shipped", "order.out_for_delivery"]);

for (const eventName of Object.keys(STATUS_COPY) as NotificationEventType[]) {
  on(eventName, async (payload) => {
    const p = payload as unknown as OrderEventPayload;
    const { template } = STATUS_COPY[eventName];
    const data = SHIPMENT_AWARE_EVENTS.has(eventName)
      ? { name: p.name, orderNumber: p.orderNumber, courierName: p.courierName || "your courier", trackingNumber: p.trackingNumber || "not yet available" }
      : { name: p.name, orderNumber: p.orderNumber };
    await getEmailProvider().send({ channel: "email", eventType: eventName, template, to: { email: p.email }, data });
    if (p.phone) {
      await getWhatsAppProvider().send({ channel: "whatsapp", eventType: eventName, template, to: { phone: p.phone }, data });
    }
  });
}

interface PaymentFailedPayload {
  userId: string | null;
  email?: string;
  phone?: string;
  name?: string;
  razorpayOrderId: string;
}

on("payment.failed", async (payload) => {
  const p = payload as unknown as PaymentFailedPayload;
  if (p.email) {
    await getEmailProvider().send({ channel: "email", eventType: "payment.failed", template: "payment_failed", to: { email: p.email }, data: { name: p.name } });
  }
  if (p.phone) {
    await getWhatsAppProvider().send({ channel: "whatsapp", eventType: "payment.failed", template: "payment_failed", to: { phone: p.phone }, data: { name: p.name } });
  }

  await createNotificationsForRoles({
    roles: NEW_ORDER_NOTIFICATION_ROLES,
    type: "payment.failed",
    title: "Payment failed",
    message: `A checkout payment attempt failed${p.name ? ` for ${p.name}` : ""}.`,
    metadata: { razorpayOrderId: p.razorpayOrderId },
  });
});

interface CodRestrictedPayload {
  userId: string;
  email: string;
  phone?: string;
  name: string;
}

/**
 * Fires once, right when the automatic threshold is crossed (status-
 * service.ts -> cod-risk.ts) or an admin manually restricts COD — never on
 * every subsequent blocked checkout attempt (that's a plain inline checkout
 * error, not a notification). Email + WhatsApp only, matching Part 5's
 * instruction to reuse the existing provider abstraction and Module 19's
 * decision that customers never get an in-app row. Admin fan-out mirrors
 * the same operational-alert pattern already used for new-order/payment-
 * failed/low-stock — reuses NEW_ORDER_NOTIFICATION_ROLES, no new role.
 */
on("cod.restricted", async (payload) => {
  const p = payload as unknown as CodRestrictedPayload;
  await getEmailProvider().send({ channel: "email", eventType: "cod.restricted", template: "cod_restricted", to: { email: p.email }, data: { name: p.name } });
  if (p.phone) {
    await getWhatsAppProvider().send({ channel: "whatsapp", eventType: "cod.restricted", template: "cod_restricted", to: { phone: p.phone }, data: { name: p.name } });
  }

  await createNotificationsForRoles({
    roles: NEW_ORDER_NOTIFICATION_ROLES,
    type: "cod.restricted",
    title: "COD restricted",
    message: `Cash on Delivery was restricted for ${p.name} after repeated unaccepted deliveries.`,
    link: `/admin/customers/${p.userId}`,
    metadata: { userId: p.userId },
  });
});

interface RefundEventPayload {
  userId: string | null;
  orderId: string;
  orderNumber: string;
  email: string;
  phone?: string;
  name: string;
  amount: number;
}

const REFUND_STATUS_COPY: Record<string, { template: string }> = {
  "payment.refund_initiated": { template: "refund_initiated" },
  "payment.refund_processed": { template: "refund_processed" },
  "payment.refund_failed": { template: "refund_failed" },
};

/**
 * Fired by razorpay-refund.ts (Module 28) at each refund state transition —
 * mirrors the existing STATUS_COPY loop pattern for order-status events
 * (same file, above). refund_failed additionally fans out to staff (same
 * operational-alert pattern as payment.failed/cod.restricted) since a
 * failed refund needs human follow-up; initiated/processed are customer-
 * facing only, matching how order-status events work.
 */
for (const eventName of Object.keys(REFUND_STATUS_COPY) as NotificationEventType[]) {
  on(eventName, async (payload) => {
    const p = payload as unknown as RefundEventPayload;
    const { template } = REFUND_STATUS_COPY[eventName];
    const data = { name: p.name, orderNumber: p.orderNumber, amount: p.amount };
    await getEmailProvider().send({ channel: "email", eventType: eventName, template, to: { email: p.email }, data });
    if (p.phone) {
      await getWhatsAppProvider().send({ channel: "whatsapp", eventType: eventName, template, to: { phone: p.phone }, data });
    }

    if (eventName === "payment.refund_failed") {
      await createNotificationsForRoles({
        roles: NEW_ORDER_NOTIFICATION_ROLES,
        type: eventName,
        title: "Refund failed",
        message: `A refund attempt failed for order ${p.orderNumber} (₹${p.amount.toLocaleString("en-IN")}) — needs manual follow-up.`,
        link: `/admin/orders/${p.orderId}`,
        metadata: { orderId: p.orderId, orderNumber: p.orderNumber },
      });
    }
  });
}

interface PasswordResetPayload {
  email: string;
  name: string;
  resetUrl: string;
}

/** Email only — deliberately no WhatsApp/SMS for a security-sensitive
 *  reset link (keeps it to one channel, which is also the standard,
 *  expected convention for this kind of message) and no in-app row (the
 *  person can't be logged in to see it — they've forgotten their password). */
on("password.reset", async (payload) => {
  const p = payload as unknown as PasswordResetPayload;
  await getEmailProvider().send({
    channel: "email",
    eventType: "password.reset",
    template: "password_reset",
    to: { email: p.email },
    data: { name: p.name, resetUrl: p.resetUrl },
  });
});

interface InventoryPayload {
  productId: string;
  productName: string;
  sku: string;
  stockAvailable: number;
  lowStockAt: number;
}

on("inventory.low_stock", async (payload) => {
  const p = payload as unknown as InventoryPayload;
  await createNotificationsForRoles({
    roles: LOW_STOCK_NOTIFICATION_ROLES,
    type: "inventory.low_stock",
    title: "Low stock",
    message: `${p.productName} (${p.sku}) is low on stock — ${p.stockAvailable} left, threshold ${p.lowStockAt}.`,
    link: `/admin/products/${p.productId}/stock`,
    metadata: { productId: p.productId, sku: p.sku },
  });
});

on("inventory.out_of_stock", async (payload) => {
  const p = payload as unknown as InventoryPayload;
  await createNotificationsForRoles({
    roles: LOW_STOCK_NOTIFICATION_ROLES,
    type: "inventory.out_of_stock",
    title: "Out of stock",
    message: `${p.productName} (${p.sku}) is now out of stock.`,
    link: `/admin/products/${p.productId}/stock`,
    metadata: { productId: p.productId, sku: p.sku },
  });
});

export { emit };
