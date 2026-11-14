import "server-only";
import { prisma } from "@/lib/prisma";
import type { OrderStatusChangeMetadata, OrderShipmentUpdateMetadata } from "@/lib/admin/activity-log";

export interface OrderTimelineEvent {
  id: string;
  type: "status" | "shipment";
  createdAt: Date;
  actorName: string;
  actorRole: string;
  previousStatus?: string;
  newStatus?: string;
  statusReason?: string | null;
  previousCourierName?: string | null;
  newCourierName?: string | null;
  previousTrackingNumber?: string | null;
  newTrackingNumber?: string | null;
}

/**
 * Reuses the existing ActivityLog rows written by status-service.ts
 * ("order.status_changed" / "order.shipment_updated") — the only place
 * an order's status/shipment history exists over time, since Order itself
 * only stores current state. No new table, no duplicate audit system
 * (Module 24 Part 12).
 */
export async function getOrderActivityTimeline(orderId: string): Promise<OrderTimelineEvent[]> {
  const rows = await prisma.activityLog.findMany({
    where: { entity: "Order", entityId: orderId, action: { in: ["order.status_changed", "order.shipment_updated"] } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, role: true } } },
  });

  return rows.map((row) => {
    const metadata = (row.metadata ?? {}) as Partial<OrderStatusChangeMetadata & OrderShipmentUpdateMetadata>;
    return {
      id: row.id,
      type: row.action === "order.status_changed" ? "status" : "shipment",
      createdAt: row.createdAt,
      actorName: row.user.name,
      actorRole: row.user.role,
      previousStatus: metadata.previousStatus,
      newStatus: metadata.newStatus,
      statusReason: metadata.statusReason ?? null,
      // Left as `undefined` (never defaulted to null) when the key is
      // absent from stored metadata — that's how "this field didn't change"
      // is distinguished from "it changed to an empty value" downstream.
      previousCourierName: metadata.previousCourierName,
      newCourierName: metadata.newCourierName,
      previousTrackingNumber: metadata.previousTrackingNumber,
      newTrackingNumber: metadata.newTrackingNumber,
    };
  });
}

export interface CustomerTimelineMilestone {
  status: string;
  reachedAt: Date;
}

/**
 * Customer-safe projection: status milestones and dates only — never the
 * staff actor name/role, and never raw courier/tracking diff detail (the
 * order page already shows current courier/tracking separately).
 */
export async function getCustomerOrderTimeline(orderId: string): Promise<CustomerTimelineMilestone[]> {
  const events = await getOrderActivityTimeline(orderId);
  return events
    .filter((e) => e.type === "status" && e.newStatus)
    .map((e) => ({ status: e.newStatus as string, reachedAt: e.createdAt }));
}
