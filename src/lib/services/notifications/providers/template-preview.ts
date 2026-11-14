import "server-only";
import { getBrandSettings } from "@/lib/config/brand";

/**
 * One-line human-readable preview per template, purely for local console
 * providers — never sent anywhere, never parsed by real send logic. A real
 * provider integration (email HTML templates, WhatsApp Business API
 * approved templates) would render its own content; this exists only so a
 * developer reading local logs can see the actual message shape, not just
 * raw variables — most importantly, the full password-reset link.
 */
const TEMPLATE_BODIES: Record<string, string> = {
  welcome: "Hi {{name}}, welcome to {{brandName}}!",
  order_placed: "Hi {{name}}, your order {{orderNumber}} has been placed. Total: ₹{{total}}.",
  order_confirmed: "Hi {{name}}, your order {{orderNumber}} has been confirmed.",
  order_packed: "Hi {{name}}, your order {{orderNumber}} has been packed and is ready to ship.",
  order_shipped: "Hi {{name}}, your order {{orderNumber}} has shipped via {{courierName}}. Tracking number: {{trackingNumber}}.",
  order_out_for_delivery: "Hi {{name}}, your order {{orderNumber}} is out for delivery via {{courierName}} (tracking: {{trackingNumber}}).",
  order_delivered: "Hi {{name}}, your order {{orderNumber}} has been delivered.",
  order_cancelled: "Hi {{name}}, your order {{orderNumber}} has been cancelled.",
  order_returned: "Hi {{name}}, your order {{orderNumber}} has been marked as returned.",
  payment_failed: "Hi {{name}}, your recent payment attempt did not go through. You have not been charged.",
  password_reset: "Hi {{name}}, reset your password: {{resetUrl}} (expires in 60 minutes, single use).",
  cod_restricted: "Hi {{name}}, Cash on Delivery isn't currently available for your account. You can still place orders using online payment.",
  refund_initiated: "Hi {{name}}, a refund of ₹{{amount}} for order {{orderNumber}} has been initiated and is being processed by your bank/card network.",
  refund_processed: "Hi {{name}}, your refund of ₹{{amount}} for order {{orderNumber}} has been processed.",
  refund_failed: "Hi {{name}}, we're sorry — the refund of ₹{{amount}} for order {{orderNumber}} could not be completed. Our team has been notified and will follow up.",
  integration_test: "This is a test message from the {{brandName}} admin Integrations dashboard, triggered by {{triggeredBy}}. If you received this, the {{channel}} provider is wired up correctly.",
};

/** {{brandName}} defaults from the static brand config (Module 37) unless a caller already supplied its own — no caller currently does, so this is the effective value everywhere. */
export function renderTemplatePreview(template: string, data: Record<string, unknown>): string {
  const body = TEMPLATE_BODIES[template];
  const withDefaults: Record<string, unknown> = { brandName: getBrandSettings().name, ...data };
  if (!body) return JSON.stringify(data);
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => (withDefaults[key] !== undefined ? String(withDefaults[key]) : `{{${key}}}`));
}
