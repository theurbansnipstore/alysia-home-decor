import "server-only";
import type { OrderStatus } from "@prisma/client";
import type { NormalizedShipmentStatus } from "@/lib/integrations/shipping/types";

export type StatusMappingResult =
  | { kind: "TRANSITION"; targetStatus: OrderStatus }
  | { kind: "INFO_ONLY" }
  | { kind: "NEEDS_REVIEW"; reason: string };

/**
 * Maps a normalized courier status to what shipment-service.ts should do
 * next. Internal statuses are always one of the EXISTING OrderStatus enum
 * values (Module 24) — this module never invents a new one just because a
 * courier uses different terminology (Part 8).
 *
 * Deliberately conservative on return-adjacent events: RTO_INITIATED and
 * RETURN_INITIATED are flagged for manual admin review rather than
 * auto-transitioning to RETURNED. A courier reporting "RTO initiated" or
 * "return requested" is reporting ITS OWN intent/attempt, not confirmation
 * that the merchant has received and verified the item back — conflating
 * the two would let a courier-side signal silently trigger a business
 * outcome (RETURNED, and eventually a refund) the module's own Part 16/17
 * explicitly say must stay behind an explicit, verified action. Even
 * RETURNED itself is flagged rather than auto-applied, for the same reason
 * — "courier says returned" is not the same as "merchant confirmed the
 * returned item", and status-service.ts's own RETURNED path requires a
 * statusReason an automated event has no reliable way to choose correctly
 * (CUSTOMER_REFUSED_COD is COD-risk-bearing and must never be guessed).
 */
export function mapCourierStatusToAction(status: NormalizedShipmentStatus): StatusMappingResult {
  switch (status) {
    case "PICKUP_SCHEDULED":
    case "IN_TRANSIT":
      // No matching internal status exists between PACKED/READY_TO_SHIP and
      // SHIPPED/OUT_FOR_DELIVERY for these — tracking-only, no Order write,
      // and deliberately not logged to ActivityLog either (Part 15 of
      // Module 24 and this module's own Part 9: routine heartbeat-style
      // courier pings would flood the audit trail for no operational
      // benefit; the provider's own tracking history is the source of
      // truth for these, not ours).
      return { kind: "INFO_ONLY" };
    case "PICKED_UP":
      return { kind: "TRANSITION", targetStatus: "SHIPPED" };
    case "OUT_FOR_DELIVERY":
      return { kind: "TRANSITION", targetStatus: "OUT_FOR_DELIVERY" };
    case "DELIVERED":
      return { kind: "TRANSITION", targetStatus: "DELIVERED" };
    case "RTO_INITIATED":
      return { kind: "NEEDS_REVIEW", reason: "Courier reported RTO (return-to-origin) initiated — confirm with the courier/admin before changing this order's status." };
    case "RETURN_INITIATED":
      return { kind: "NEEDS_REVIEW", reason: "Courier reported a return initiated — this is the courier's own signal, not merchant confirmation that the item was received back." };
    case "RETURNED":
      return { kind: "NEEDS_REVIEW", reason: "Courier reported the shipment as returned — requires admin verification of the physical item and an explicit return reason before marking the order RETURNED." };
    case "UNKNOWN":
    default:
      return { kind: "NEEDS_REVIEW", reason: `Unrecognized courier status "${status}" — no mapping exists.` };
  }
}
