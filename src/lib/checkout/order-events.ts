import "server-only";

export type OrderEventType =
  | "order.created"
  | "payment.pending"
  | "payment.success"
  | "payment.failed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "returned"
  | "refunded";

export interface OrderEventPayload {
  orderId: string;
  type: OrderEventType;
  data?: Record<string, unknown>;
}

export interface OrderEventRecorder {
  record(payload: OrderEventPayload): Promise<void>;
}

/**
 * Console-log implementation for now. Module 11 adds a real OrderEvent
 * Prisma model + timeline UI and swaps this class for one that writes to
 * it — order-service.ts's call to recordOrderEvent() doesn't change
 * either way. Module 9 only ever records "order.created".
 */
class ConsoleOrderEventRecorder implements OrderEventRecorder {
  async record(payload: OrderEventPayload): Promise<void> {
    console.log(`[order-event] ${payload.type} — order ${payload.orderId}`, payload.data ?? {});
  }
}

const recorder: OrderEventRecorder = new ConsoleOrderEventRecorder();

export async function recordOrderEvent(payload: OrderEventPayload): Promise<void> {
  await recorder.record(payload);
}
