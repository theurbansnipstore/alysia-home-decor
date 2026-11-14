import "server-only";
import type { NotificationEventType } from "./types";

type Listener = (payload: Record<string, unknown>) => void | Promise<void>;

const listeners = new Map<NotificationEventType, Listener[]>();

export function on(event: NotificationEventType, listener: Listener): void {
  const existing = listeners.get(event) ?? [];
  existing.push(listener);
  listeners.set(event, existing);
}

/**
 * Business logic (registration, checkout) calls this and never imports a
 * specific provider directly. Listener failures are caught and logged,
 * never re-thrown — a broken notification must never fail the action that
 * triggered it (a user should still be registered even if the welcome
 * email fails to send).
 */
export async function emit(event: NotificationEventType, payload: Record<string, unknown>): Promise<void> {
  const handlers = listeners.get(event) ?? [];
  for (const handler of handlers) {
    try {
      await handler(payload);
    } catch (err) {
      console.error(`[notifications] listener for "${event}" failed`, err);
    }
  }
}
