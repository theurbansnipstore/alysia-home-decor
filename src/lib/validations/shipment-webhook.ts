import { z } from "zod";

const NORMALIZED_STATUS_VALUES = [
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RTO_INITIATED",
  "RETURN_INITIATED",
  "RETURNED",
  "UNKNOWN",
] as const;

/**
 * Shape of OUR OWN mock shipment-webhook envelope (simulate-shipment.ts /
 * the local test harness) — not Shiprocket's real webhook payload, which
 * hasn't been confirmed against their documentation. `actorUserId` only
 * exists because this is a local simulator standing in for a real webhook;
 * see shipment-service.ts's and the module report's notes on the
 * unresolved "who does a real automated webhook attribute an ActivityLog
 * entry to" question.
 */
export const shipmentWebhookEventSchema = z.object({
  trackingNumber: z.string().trim().min(1),
  status: z.enum(NORMALIZED_STATUS_VALUES),
  occurredAt: z.string().datetime(),
  actorUserId: z.string().min(1),
});
export type ShipmentWebhookEventInput = z.infer<typeof shipmentWebhookEventSchema>;
