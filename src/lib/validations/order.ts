import { z } from "zod";

export const orderStatusValues = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "READY_TO_SHIP",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
] as const;

export const orderReturnReasonValues = [
  "CUSTOMER_REFUSED_COD",
  "CUSTOMER_REQUESTED_RETURN",
  "DELIVERY_FAILURE",
  "DAMAGED",
  "OTHER",
  "CUSTOMER_REQUESTED_CANCELLATION",
  "PAYMENT_ISSUE",
  "ADDRESS_ISSUE",
  "SELLER_UNABLE_TO_FULFILL",
  "PRODUCT_UNAVAILABLE",
] as const;

/** Module 25 Part 2: which reasons are honest for a CANCELLED order (only ever reachable pre-shipment) vs. a RETURNED order (only ever reachable post-shipment). OTHER is shared. status-service.ts is the actual enforcement point — these are exported so the client form can offer the same restricted set rather than inventing its own list. */
export const CANCELLATION_REASON_VALUES = [
  "CUSTOMER_REQUESTED_CANCELLATION",
  "PAYMENT_ISSUE",
  "ADDRESS_ISSUE",
  "SELLER_UNABLE_TO_FULFILL",
  "PRODUCT_UNAVAILABLE",
  "OTHER",
] as const;

export const RETURN_REASON_VALUES = [
  "CUSTOMER_REFUSED_COD",
  "CUSTOMER_REQUESTED_RETURN",
  "DELIVERY_FAILURE",
  "DAMAGED",
  "OTHER",
] as const;

/**
 * Only shape validation here — WHICH transitions are legal, and which
 * statusReason values are legal for a given transition (e.g.
 * CUSTOMER_REFUSED_COD only from OUT_FOR_DELIVERY on a COD order), is
 * server-side business logic in status-service.ts, never trusted from the
 * client beyond "is this a real enum value".
 *
 * statusReason is required exactly when status is CANCELLED or RETURNED
 * (Module 21) — this is what makes reason-capture non-optional for admins
 * going forward, while every pre-existing order simply has no such field
 * to have skipped.
 */
export const updateOrderStatusSchema = z
  .object({
    status: z.enum(orderStatusValues),
    trackingNumber: z.string().trim().max(100).nullable().optional(),
    courierName: z.string().trim().max(100).nullable().optional(),
    statusReason: z.enum(orderReturnReasonValues).nullable().optional(),
  })
  .refine((data) => !(data.status === "CANCELLED" || data.status === "RETURNED") || !!data.statusReason, {
    message: "A reason is required when cancelling or returning an order.",
    path: ["statusReason"],
  });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
