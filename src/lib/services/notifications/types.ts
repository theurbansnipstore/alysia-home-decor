export type NotificationEventType =
  | "user.registered"
  | "order.placed"
  | "order.confirmed"
  | "order.packed"
  | "order.shipped"
  | "order.out_for_delivery"
  | "order.delivered"
  | "order.cancelled"
  | "order.returned"
  | "payment.failed"
  | "password.reset"
  | "inventory.low_stock"
  | "inventory.out_of_stock"
  | "cod.restricted"
  | "payment.refund_initiated"
  | "payment.refund_processed"
  | "payment.refund_failed";

export type NotificationChannel = "email" | "whatsapp" | "sms" | "push";

export interface SendNotificationParams {
  channel: NotificationChannel;
  /** Template identifier, not message content — a future Admin Dashboard edits template content by this key, never touches provider code. */
  template: string;
  /** The originating event, for the provider's own logging/observability
   *  (e.g. a local console provider printing "which event triggered this
   *  send") — providers never branch behavior on it, only templates do. */
  eventType?: NotificationEventType;
  to: { email?: string; phone?: string };
  data: Record<string, unknown>;
}

export interface NotificationChannelProvider {
  channel: NotificationChannel;
  send(params: SendNotificationParams): Promise<void>;
}
