import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type TxOrClient = PrismaClient | Prisma.TransactionClient;

export interface OrderStatusChangeMetadata {
  previousStatus: string;
  newStatus: string;
  statusReason: string | null;
  /** Only present when courier/tracking were changed in the same request that changed status — avoids a second row for the same admin action (Module 24 Part 6). */
  previousCourierName?: string | null;
  newCourierName?: string | null;
  previousTrackingNumber?: string | null;
  newTrackingNumber?: string | null;
}

/** Written only when courier/tracking change WITHOUT a status change — if status also changed, the same info is folded into OrderStatusChangeMetadata instead, per Module 24 Part 6's "do not create duplicate activity rows". Only the fields that actually changed are present. */
export interface OrderShipmentUpdateMetadata {
  previousCourierName?: string | null;
  newCourierName?: string | null;
  previousTrackingNumber?: string | null;
  newTrackingNumber?: string | null;
}

export interface CodRestrictionMetadata {
  previousCodStatus: boolean;
  newCodStatus: boolean;
  reason: string;
  /** Only set for the automatic (threshold-crossing) path — omitted for a manual admin override, where ActivityLog.userId already IS the actor. */
  performedBy?: "SYSTEM";
  /** Only meaningful on the automatic path. */
  qualifyingIncidentCount?: number;
}

export interface ProductCreateMetadata {
  action: "CREATE";
  productName: string;
  sku: string;
  categoryId: string;
  price: string;
  status: string;
  stockAvailable: number;
}

export interface ProductUpdateMetadata {
  /** Never empty — the write site skips logging entirely for a true no-op (Module 23 Part 10). */
  changedFields: string[];
  /** Only short, scalar business fields — never `description` (large text, tracked in changedFields only, not duplicated here). */
  before: Record<string, string | number | boolean | null>;
  after: Record<string, string | number | boolean | null>;
}

export interface ProductArchiveMetadata {
  action: "ARCHIVE" | "RESTORE";
  previousStatus: string;
  newStatus: string;
}

/** Module 41 — one aggregate row per bulk import run, same "aggregate not
 *  per-row" rule as ProductBulkOperationMetadata below, for the new
 *  category-SEO/image bulk-import paths. */
export interface CategorySeoImportMetadata {
  operation: "IMPORT";
  updated: number;
  unchanged: number;
  failed: number;
}

export interface ProductImageImportMetadata {
  operation: "IMPORT";
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}

/** Bulk edit and CSV/XLSX import both bypass the single-product routes entirely (Module 23 audit) — one aggregate row per operation, never one row per affected product, since a selection can be up to MAX_BULK_SELECTION (5000) products. */
export interface ProductBulkOperationMetadata {
  operation: "BULK_UPDATE" | "IMPORT";
  affectedProductCount: number;
  /** Capped sample, never the full list for a large selection. */
  affectedProductIds?: string[];
  idsTruncated?: boolean;
  changedFields?: string[];
  created?: number;
  updated?: number;
  unchanged?: number;
  failed?: number;
}

/**
 * Written when an inbound courier/shipment webhook event can't be safely
 * auto-applied to Order.status (Module 23 shipment-integration audit) —
 * e.g. RTO/return-adjacent events, which must stay behind explicit admin
 * verification rather than a courier's own signal. Also written when a
 * mapped transition is rejected by the existing status-service.ts
 * validation (e.g. a stale/out-of-order webhook) so the event isn't just
 * silently dropped. Never a second audit system — same ActivityLog table,
 * same logActivity() writer as every other action.
 */
export interface ShipmentEventFlaggedMetadata {
  trackingNumber: string;
  providerStatus: string;
  reason: string;
  /** Present only when a concrete target status was computed but rejected by status-service.ts's transition validation — omitted for events that were never mapped to a transition at all (e.g. RTO_INITIATED). */
  attemptedTargetStatus?: string;
}

/**
 * Refund lifecycle (Module 28) — one row per state transition
 * (initiated/completed/failed), never a rewrite of a prior row, so the full
 * history is preserved. `previousRefundStatus`/`newRefundStatus` use
 * Razorpay's own real refund.status vocabulary (pending/processed/failed —
 * see prisma/schema.prisma's RefundStatus enum). Never includes API
 * credentials, headers, or the idempotency key value itself.
 */
export interface PaymentRefundMetadata {
  paymentId: string;
  razorpayPaymentId: string;
  razorpayRefundId?: string;
  refundAmount: string;
  previousRefundStatus: string | null;
  newRefundStatus: string;
  /** Only present on a failure — the reason surfaced to the admin, never a raw provider error blob that might contain sensitive detail. */
  failureReason?: string;
}

/**
 * Module 29 — admin-triggered integration health checks / test actions
 * (e.g. "Verify Razorpay Credentials", "Test Shiprocket Authentication",
 * "Send Test Email"). `detail` is always a short, safe, human-readable
 * string (an HTTP status, a provider error class) — never a raw response
 * body, header, or credential value.
 */
export interface IntegrationTestMetadata {
  integration: "razorpay_payment" | "shiprocket" | "email" | "whatsapp";
  action: "verify_credentials" | "test_authentication" | "test_send";
  result: "success" | "failure";
  detail?: string;
  /** Only present for test_send — the masked/plain destination is fine to log (not a secret), unlike provider credentials. */
  destination?: string;
}

/** Module 36 — CMS page create/update/publish/unpublish/delete. */
export interface PageChangeMetadata {
  action: "CREATE" | "UPDATE" | "PUBLISH" | "UNPUBLISH" | "DELETE";
  pageTitle: string;
  slug: string;
  previousStatus?: string;
  newStatus?: string;
}

export type ActivityLogMetadata =
  | OrderStatusChangeMetadata
  | OrderShipmentUpdateMetadata
  | CodRestrictionMetadata
  | ProductCreateMetadata
  | ProductUpdateMetadata
  | ProductArchiveMetadata
  | ProductBulkOperationMetadata
  | ShipmentEventFlaggedMetadata
  | PaymentRefundMetadata
  | IntegrationTestMetadata
  | PageChangeMetadata
  | CategorySeoImportMetadata
  | ProductImageImportMetadata;

export interface LogActivityInput {
  /** The existing ActivityLog.userId semantics are preserved exactly (actor for admin-performed actions; see CodRestrictionMetadata.performedBy for the one case where it's the affected user instead). */
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: ActivityLogMetadata;
}

/**
 * The single writer for every ActivityLog row (Module 22) — centralizes the
 * "never log a secret" contract in one place. Metadata is always a typed,
 * hand-picked object (see the interfaces above), never a spread of a raw
 * request body, User, Order, or Payment record — so a password hash,
 * session token, or Razorpay credential can never end up here by accident.
 * Accepts a transaction client so callers inside a $transaction (e.g.
 * status-service.ts) get the same atomicity they already have.
 */
export async function logActivity(client: TxOrClient, input: LogActivityInput): Promise<void> {
  await client.activityLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
