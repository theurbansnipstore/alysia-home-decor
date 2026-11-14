import "server-only";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/orders/status-service";
import { logActivity } from "@/lib/admin/activity-log";
import { mapCourierStatusToAction } from "@/lib/integrations/shipping/status-mapping";
import { getShipmentProvider } from "@/lib/integrations/shipping/provider-factory";
import type { NormalizedShipmentEvent, CreateShipmentResult } from "@/lib/integrations/shipping/types";

export interface CreateShipmentForOrderResult {
  success: boolean;
  error?: string;
  trackingNumber?: string;
  courierName?: string;
}

/**
 * Admin-initiated "create shipment" action, routed through the
 * getShipmentProvider() factory (Module 27) — MockShipmentProvider under
 * SHIPPING_PROVIDER=mock (default/local dev), the real ShiprocketProvider
 * under SHIPPING_PROVIDER=shiprocket with credentials configured.
 * Deliberately reuses updateOrderStatus()'s existing shipment-only code
 * path (Module 24) to persist the returned courier/tracking number, rather
 * than writing to Order directly — the SAME transaction/audit/idempotency
 * guarantees Module 24 already built apply here for free. Passing the
 * order's own current status back unchanged is what makes this a
 * shipment-only update rather than a status transition (mirrors exactly how
 * StatusUpdateForm.tsx's courier/tracking-only save already works).
 *
 * Duplicate-shipment guard (Module 27 Part 6, fixing Module 23's "shipment
 * creation isn't idempotent" finding), HARDENED in Module 30 Part 3 to close
 * the race the Module 27 comment above originally flagged and left open:
 *
 * The old guard was read-then-write — a plain findUnique() check followed,
 * much later, by a separate write. Two concurrent requests could both read
 * trackingNumber as null, both pass the check, and both call the real
 * courier API before either one's write ever landed (in production, this
 * would create two real Shiprocket shipments for one order).
 *
 * Fixed with an atomic conditional update (compare-and-swap) on the SAME
 * existing `Order.trackingNumber` column — no schema change, per Part 3's
 * explicit "do not add a migration for this" instruction. Before calling
 * the provider, this "claims" the order with `updateMany({ where: { id,
 * trackingNumber: null }, data: { trackingNumber: SHIPMENT_CLAIM_SENTINEL
 * } } })`. Prisma compiles that to one `UPDATE ... WHERE id = ? AND
 * trackingNumber IS NULL` statement — MySQL/InnoDB takes a row lock for the
 * duration of that single statement, so of two concurrent claims only one
 * can ever see `trackingNumber IS NULL` and succeed (`count === 1`); the
 * loser's WHERE clause fails to match (the winner's write is already
 * visible) and it gets `count === 0`, so it never calls the provider at
 * all. This is the same "atomic conditional update" class of fix Part 3
 * explicitly named as an acceptable safe option.
 *
 * The sentinel is released back to null if the provider call fails, so a
 * failed attempt doesn't permanently brick the order as "already shipped".
 * `SHIPMENT_CLAIM_SENTINEL` is never a value any real courier would ever
 * assign — real AWB/tracking codes are courier-formatted alphanumerics,
 * never this exact literal string.
 */
const SHIPMENT_CLAIM_SENTINEL = "__SHIPMENT_CREATION_IN_PROGRESS__";

export async function createShipmentForOrder(orderId: string, actorUserId: string): Promise<CreateShipmentForOrderResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, status: true, trackingNumber: true } });
  if (!order) return { success: false, error: "Order not found." };
  if (order.trackingNumber) {
    return { success: false, error: `This order already has a shipment (tracking number ${order.trackingNumber}). Cancel or clear it manually before creating a new one.` };
  }

  // Atomic claim — see header comment. Re-checks the same condition the
  // findUnique() above already checked, but this time as a single,
  // row-locked, all-or-nothing statement instead of a separate read.
  const claim = await prisma.order.updateMany({
    where: { id: orderId, trackingNumber: null },
    data: { trackingNumber: SHIPMENT_CLAIM_SENTINEL },
  });
  if (claim.count === 0) {
    return { success: false, error: "This order already has a shipment (or one is currently being created). Refresh and check before retrying." };
  }

  let shipment: CreateShipmentResult;
  try {
    shipment = await getShipmentProvider().createShipment({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (err) {
    // Release the claim so a real retry isn't permanently blocked by our
    // own sentinel — the order genuinely has no shipment yet.
    await prisma.order.update({ where: { id: orderId }, data: { trackingNumber: null } }).catch((releaseErr) => {
      console.error("[shipment-service] failed to release shipment claim after provider error — order may be stuck", orderId, releaseErr);
    });
    console.error("[shipment-service] shipment provider call failed", orderId, err);
    return { success: false, error: err instanceof Error ? err.message : "Could not create shipment." };
  }

  const result = await updateOrderStatus({
    orderId: order.id,
    status: order.status,
    courierName: shipment.courierName,
    trackingNumber: shipment.trackingNumber,
    actorUserId,
  });
  if (!result.success) {
    // The provider call already succeeded (a real shipment may exist at the
    // courier) — do NOT release the sentinel back to null here, since doing
    // so would let a second click create a second real shipment for
    // something that already exists. Left claimed, surfaced as a hard
    // error for manual admin follow-up (same posture as every other
    // "real external side effect succeeded, our own DB write then failed"
    // case in this codebase, e.g. razorpay-refund.ts's outcome handling).
    console.error("[shipment-service] provider shipment succeeded but persisting it failed — manual follow-up required", orderId, shipment, result.error);
    return { success: false, error: "The shipment may have been created with the courier, but saving it failed. Please check manually before retrying." };
  }

  return { success: true, trackingNumber: shipment.trackingNumber, courierName: shipment.courierName };
}

export interface ProcessShipmentEventResult {
  handled: boolean;
  reason?: string;
}

/**
 * The ONLY place an inbound shipment webhook event is allowed to affect an
 * order — never a direct Order.update() (Module 23 Part 3's central rule:
 * external provider events must not directly mutate order state). Looks the
 * order up by trackingNumber (Order.trackingNumber already exists, no
 * schema change needed) rather than a dedicated provider-shipment-id column
 * — see this file's own limitation note in the final module report:
 * trackingNumber has no @unique constraint today, so this uses findFirst
 * and treats a genuine collision as an integrity problem worth surfacing,
 * not silently resolving.
 */
export async function processShipmentEvent(event: NormalizedShipmentEvent, actorUserId: string): Promise<ProcessShipmentEventResult> {
  if (!event.trackingNumber) {
    return { handled: false, reason: "Event carries no tracking number — cannot resolve an order." };
  }

  const matches = await prisma.order.findMany({ where: { trackingNumber: event.trackingNumber }, select: { id: true, status: true } });
  if (matches.length === 0) {
    return { handled: false, reason: `No order found with tracking number "${event.trackingNumber}".` };
  }
  if (matches.length > 1) {
    // Deliberately not picking one — Order.trackingNumber has no unique
    // constraint today, so this is a real (if rare) integrity risk once
    // shipments are provider-assigned rather than admin-typed. Flagged as
    // a candidate schema improvement in the final report, not silently
    // resolved by guessing which order the event is really for.
    console.error("[shipment-service] multiple orders share tracking number", event.trackingNumber, matches.map((m) => m.id));
    return { handled: false, reason: `Multiple orders share tracking number "${event.trackingNumber}" — cannot safely resolve.` };
  }

  const order = matches[0];
  const mapping = mapCourierStatusToAction(event.status);

  if (mapping.kind === "INFO_ONLY") {
    return { handled: true };
  }

  if (mapping.kind === "NEEDS_REVIEW") {
    await logActivity(prisma, {
      userId: actorUserId,
      action: "shipment.event_flagged",
      entity: "Order",
      entityId: order.id,
      metadata: { trackingNumber: event.trackingNumber, providerStatus: event.status, reason: mapping.reason },
    });
    return { handled: true };
  }

  // mapping.kind === "TRANSITION" — routed through the existing, unmodified
  // status-service.ts, so transition validation, stock restoration,
  // ActivityLog, OrderTimeline, and notifications all stay centralized
  // exactly as Module 24 built them (Module 23 Part 3's central rule).
  const result = await updateOrderStatus({ orderId: order.id, status: mapping.targetStatus, actorUserId });
  if (!result.success) {
    // Not a crash — a stale/out-of-order/duplicate webhook hitting an
    // invalid transition is an expected possibility (Module 23 Part 20),
    // not a bug. Acknowledge receipt, leave a breadcrumb for admin review
    // instead of silently dropping it.
    await logActivity(prisma, {
      userId: actorUserId,
      action: "shipment.event_flagged",
      entity: "Order",
      entityId: order.id,
      metadata: {
        trackingNumber: event.trackingNumber,
        providerStatus: event.status,
        reason: `Mapped transition to ${mapping.targetStatus} was rejected: ${result.error}`,
        attemptedTargetStatus: mapping.targetStatus,
      },
    });
  }

  return { handled: true };
}
