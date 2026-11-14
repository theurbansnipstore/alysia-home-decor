import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatus, OrderReturnReason } from "@prisma/client";
import { emit } from "@/lib/services/notifications";
import { evaluateCodRiskAfterRefusal } from "@/lib/orders/cod-risk";
import { logActivity } from "@/lib/admin/activity-log";
import { CANCELLATION_REASON_VALUES, RETURN_REASON_VALUES } from "@/lib/validations/order";

/**
 * Explicit allowed-transition map — the only source of truth for what
 * status changes are legal. CANCELLED/RETURNED/REFUNDED have no outgoing
 * transitions (terminal). Cancellation is only reachable pre-shipment
 * (PENDING/PACKED/READY_TO_SHIP); RETURNED is only reachable once an order
 * has actually gone out (OUT_FOR_DELIVERY/DELIVERED) — this is what rules
 * out things like DELIVERED→PACKED or CANCELLED→PACKED without needing a
 * separate blocklist.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // CONFIRMED exists in the schema's OrderStatus enum but wasn't named in
  // the requested flow (PENDING → PACKED → ...). Treated as an optional
  // intermediate acknowledgment step: PENDING can go straight to PACKED
  // (matching the requested flow literally) or via CONFIRMED first —
  // never left unreachable/dead, since it's a real existing enum value.
  PENDING: ["CONFIRMED", "PACKED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["READY_TO_SHIP", "CANCELLED"],
  READY_TO_SHIP: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
  REFUNDED: [],
};

const STOCK_RESTORE_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
  trackingNumber?: string | null;
  courierName?: string | null;
  /** Required (validated below) exactly when status is CANCELLED or RETURNED — see CUSTOMER_REFUSED_COD's extra scoping rule just below. */
  statusReason?: OrderReturnReason | null;
  /** Staff member performing the change — always a real, authenticated admin/order-manager id (never null), satisfying ActivityLog.userId's required constraint. */
  actorUserId: string;
}

export interface UpdateOrderStatusResult {
  success: boolean;
  error?: string;
  /** True when the requested status equalled the current status — idempotent no-op for stock/audit/notification side effects. */
  alreadyInStatus?: boolean;
  order?: { id: string; orderNumber: string; status: OrderStatus };
}

/** Every entry here is a real, reachable transition in ORDER_STATUS_TRANSITIONS
 *  above — no status is notified that the app can't actually produce.
 *  READY_TO_SHIP and REFUNDED are deliberately excluded: READY_TO_SHIP is an
 *  internal logistics step with no customer-facing meaning beyond "shipped"
 *  (which already fires), and REFUNDED is never itself an Order.status value
 *  the app sets (only Payment.status becomes "REFUNDED", as a side effect of
 *  CANCELLED/RETURNED above — see the refund-on-restore block below). */
const NOTIFICATION_EVENT_BY_STATUS: Partial<
  Record<OrderStatus, "order.confirmed" | "order.packed" | "order.shipped" | "order.out_for_delivery" | "order.delivered" | "order.cancelled" | "order.returned">
> = {
  CONFIRMED: "order.confirmed",
  PACKED: "order.packed",
  SHIPPED: "order.shipped",
  OUT_FOR_DELIVERY: "order.out_for_delivery",
  DELIVERED: "order.delivered",
  CANCELLED: "order.cancelled",
  RETURNED: "order.returned",
};

/**
 * Single entry point for admin order-status changes. Keeps the business
 * logic (transition validation, idempotency, stock restoration, audit,
 * notifications) out of the API route, per the approved design.
 */
export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<UpdateOrderStatusResult> {
  const { orderId, status, trackingNumber, courierName, statusReason, actorUserId } = input;

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!existing) {
    return { success: false, error: "Order not found." };
  }

  const alreadyInStatus = existing.status === status;
  if (!alreadyInStatus && !isValidTransition(existing.status, status)) {
    return { success: false, error: `Cannot move an order from ${existing.status} to ${status}.` };
  }

  // Reason capture (Module 21): required for CANCELLED/RETURNED (also
  // enforced at the zod layer, checked again here since this service is the
  // single source of truth per its own design). CUSTOMER_REFUSED_COD is
  // additionally scoped to the one transition it can actually be true for —
  // a COD order going OUT_FOR_DELIVERY -> RETURNED. Selecting it for a
  // DELIVERED -> RETURNED order (already received) or a non-COD order would
  // misrepresent what happened and corrupt COD-risk data, so it's rejected
  // here rather than silently accepted.
  const isCancelOrReturn = !alreadyInStatus && (status === "CANCELLED" || status === "RETURNED");
  if (isCancelOrReturn && !statusReason) {
    return { success: false, error: "A reason is required when cancelling or returning an order." };
  }
  if (
    !alreadyInStatus &&
    statusReason === "CUSTOMER_REFUSED_COD" &&
    !(status === "RETURNED" && existing.status === "OUT_FOR_DELIVERY" && existing.paymentMethod === "COD")
  ) {
    return { success: false, error: "CUSTOMER_REFUSED_COD only applies to a COD order returned from Out for Delivery." };
  }
  // Module 25 Part 2: CANCELLED only ever happens pre-shipment (see
  // ORDER_STATUS_TRANSITIONS — only PENDING/CONFIRMED/PACKED/READY_TO_SHIP
  // lead here), so the RETURNED-only reasons (CUSTOMER_REFUSED_COD,
  // CUSTOMER_REQUESTED_RETURN, DELIVERY_FAILURE, DAMAGED) all presuppose an
  // attempted or completed delivery and can never honestly apply. The
  // schema now has a distinct CANCELLED-only set (Module 25 migration
  // 20260820105859) — enforced here as the actual source of truth, same as
  // every other transition rule in this file. The inverse also holds:
  // a RETURNED order can't use a cancellation-only reason (e.g.
  // "seller unable to fulfill" makes no sense once an order has shipped).
  if (isCancelOrReturn && status === "CANCELLED" && !CANCELLATION_REASON_VALUES.includes(statusReason as (typeof CANCELLATION_REASON_VALUES)[number])) {
    return {
      success: false,
      error: "That reason doesn't apply to a cancellation — cancellation reasons describe why an order never shipped, not what happened after it did.",
    };
  }
  if (isCancelOrReturn && status === "RETURNED" && !RETURN_REASON_VALUES.includes(statusReason as (typeof RETURN_REASON_VALUES)[number])) {
    return {
      success: false,
      error: "That reason doesn't apply to a return — return reasons describe what happened after an order shipped, not why it never shipped.",
    };
  }

  // Module 24 Part 5: detect courier/tracking changes so they can be
  // audited — independently of whether status also changed this request.
  const nextTrackingNumber = trackingNumber !== undefined ? trackingNumber || null : existing.trackingNumber;
  const nextCourierName = courierName !== undefined ? courierName || null : existing.courierName;
  const trackingChanged = trackingNumber !== undefined && nextTrackingNumber !== existing.trackingNumber;
  const courierChanged = courierName !== undefined && nextCourierName !== existing.courierName;
  const shipmentChanged = trackingChanged || courierChanged;

  // Idempotency guard (Module 12 requirement): repeating the same status
  // request never re-restores stock, never writes a second audit row, and
  // never re-fires a notification — even though tracking/courier fields
  // (if provided) still apply below.
  const shouldRestoreStock = !alreadyInStatus && STOCK_RESTORE_STATUSES.includes(status);

  let updatedOrder;
  try {
    updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
          ...(courierName !== undefined ? { courierName: courierName || null } : {}),
          ...(isCancelOrReturn ? { statusReason } : {}),
        },
      });

      if (shouldRestoreStock) {
        const reason = status === "CANCELLED" ? "cancelled" : "returned";
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockAvailable: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              change: item.quantity,
              reason,
              note: `Order ${existing.orderNumber} ${reason}`,
            },
          });
        }

        // State record only — Module 11 is frozen, no Razorpay refund API
        // call happens here. COD orders are never PAID pre-delivery, so
        // this only ever fires for a previously-captured Razorpay payment.
        if (existing.payment && existing.payment.status === "PAID") {
          await tx.payment.update({ where: { id: existing.payment.id }, data: { status: "REFUNDED" } });
        }
      }

      // Best-effort audit write: caught locally so a logging failure can
      // never roll back the real order update / stock restoration above
      // (matches this project's established "a side effect must never
      // break the primary action" rule from notifications/events.ts).
      try {
        if (!alreadyInStatus) {
          // One row per admin action, never two (Module 24 Part 6) — courier/
          // tracking changes made in the same request that changes status are
          // folded into this same row rather than logged separately.
          await logActivity(tx, {
            userId: actorUserId,
            action: "order.status_changed",
            entity: "Order",
            entityId: order.id,
            metadata: {
              previousStatus: existing.status,
              newStatus: status,
              statusReason: statusReason ?? null,
              ...(courierChanged ? { previousCourierName: existing.courierName, newCourierName: nextCourierName } : {}),
              ...(trackingChanged ? { previousTrackingNumber: existing.trackingNumber, newTrackingNumber: nextTrackingNumber } : {}),
            },
          });
        } else if (shipmentChanged) {
          // Status unchanged (e.g. saving tracking info on an already-PACKED
          // order) — this is the only write-site for courier/tracking, so
          // without this branch such a change would never be audited at all.
          await logActivity(tx, {
            userId: actorUserId,
            action: "order.shipment_updated",
            entity: "Order",
            entityId: order.id,
            metadata: {
              ...(courierChanged ? { previousCourierName: existing.courierName, newCourierName: nextCourierName } : {}),
              ...(trackingChanged ? { previousTrackingNumber: existing.trackingNumber, newTrackingNumber: nextTrackingNumber } : {}),
            },
          });
        }
      } catch (err) {
        console.error("[status-service] failed to write ActivityLog (order update was not affected)", err);
      }

      return order;
    });
  } catch (err) {
    console.error("[status-service] failed to update order status", orderId, err);
    return { success: false, error: "Failed to update order status." };
  }

  // Notifications stay outside the transaction, per the approved design.
  if (!alreadyInStatus) {
    const eventType = NOTIFICATION_EVENT_BY_STATUS[status];
    if (eventType) {
      await emit(eventType, {
        userId: existing.userId,
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        email: updatedOrder.customerEmail,
        phone: updatedOrder.customerPhone,
        name: updatedOrder.customerName,
        status,
        // Only meaningful once a shipment exists — courier/tracking are still
        // null for most statuses, and the shipped/out_for_delivery templates
        // are the only ones that use them (Module 24 Part 10).
        courierName: updatedOrder.courierName,
        trackingNumber: updatedOrder.trackingNumber,
      });
    }
  }

  // COD-risk evaluation (Module 21) — also outside the transaction, same
  // reasoning as notifications: a failure here must never roll back the
  // order update that already committed. Guest orders (userId null) are
  // never evaluated — there's no stable identity to attach a restriction to.
  if (!alreadyInStatus && statusReason === "CUSTOMER_REFUSED_COD" && existing.userId) {
    try {
      await evaluateCodRiskAfterRefusal(existing.userId);
    } catch (err) {
      console.error("[status-service] COD-risk evaluation failed (order update was not affected)", err);
    }
  }

  return {
    success: true,
    alreadyInStatus,
    order: { id: updatedOrder.id, orderNumber: updatedOrder.orderNumber, status: updatedOrder.status },
  };
}
