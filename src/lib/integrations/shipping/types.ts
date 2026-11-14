/**
 * Shipment-fulfillment provider interface — deliberately distinct from
 * src/lib/providers/shipping/types.ts's `ShippingProvider`, which is a
 * checkout-time RATE QUOTE lookup (charge/ETA for a cart). This interface is
 * for the separate, later concern of actually creating and tracking a
 * shipment for an order that's already been placed and packed. The two are
 * easy to conflate by name — kept in different modules on purpose.
 *
 * No concrete Shiprocket implementation exists yet (Module 23/24 audit): its
 * real request/response contract hasn't been confirmed against Shiprocket's
 * own documentation, and this module is explicitly forbidden from making
 * real external calls or fabricating that contract. Only `MockShipmentProvider`
 * (mock-provider.ts) implements this today. A real `ShiprocketProvider` can
 * be added later by implementing this same interface, once the real API
 * contract is confirmed — nothing above this seam (shipment-service.ts,
 * status-service.ts, ActivityLog, notifications) needs to change.
 */

/** Our own internal, controlled vocabulary — never a raw courier/provider
 *  string. A future ShiprocketProvider's status-mapping layer translates
 *  Shiprocket's real terminology into these values; nothing downstream of
 *  this type ever sees provider-specific wording. */
export type NormalizedShipmentStatus =
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RTO_INITIATED"
  | "RETURN_INITIATED"
  | "RETURNED"
  | "UNKNOWN";

export interface CreateShipmentParams {
  orderId: string;
  orderNumber: string;
  /** Free-text today (Order.courierName) — a real Shiprocket integration would likely select a serviceable carrier itself rather than the caller naming one. */
  preferredCourier?: string;
  weightGrams?: number;
  dimensions?: string;
}

export interface CreateShipmentResult {
  /** Provider's own shipment identifier — NOT the same as the AWB/tracking number (a shipment can exist before an AWB is assigned). Not persisted anywhere yet — see shipment-service.ts's header comment on the Order.trackingNumber-lookup limitation. */
  providerShipmentId: string;
  courierName: string;
  trackingNumber: string;
}

export interface ShipmentStatusResult {
  status: NormalizedShipmentStatus;
  trackingNumber: string;
  lastUpdatedAt: Date;
}

export interface ShipmentProvider {
  key: string;
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  getShipmentStatus(trackingNumber: string): Promise<ShipmentStatusResult>;
  /** Not every provider/every shipment state supports cancellation — return null (not throw) when it isn't currently cancellable, so callers can show "not available" rather than treat it as an error. */
  cancelShipment(trackingNumber: string): Promise<{ cancelled: boolean } | null>;
}

/** The normalized shape our own webhook route hands to shipment-service.ts.
 *  This is OUR envelope, not Shiprocket's real webhook payload — see
 *  webhook-security.ts and the route's own header comment. */
export interface NormalizedShipmentEvent {
  trackingNumber: string;
  status: NormalizedShipmentStatus;
  occurredAt: Date;
  raw?: Record<string, unknown>;
}
