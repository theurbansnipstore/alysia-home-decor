import type { IntegrationKey } from "@/lib/integrations/integration-status";

/**
 * Static production-activation checklists (Module 29 Part 7) — verbatim
 * items from the module spec. Deliberately static content, not derived
 * from live state: these are steps a human performs (often outside this
 * app entirely, e.g. "Shiprocket account created"), not something this
 * codebase can detect or check off automatically. Rendered per-card as
 * plain reference material.
 */
export const ACTIVATION_CHECKLISTS: Record<IntegrationKey, string[]> = {
  razorpay_payment: [
    "Test/live credentials configured",
    "Webhook secret configured",
    "Webhook endpoint configured in Razorpay",
    "Payment creation tested",
    "Real test payment completed",
    "Payment signature verified",
    "Payment webhook received",
    "Duplicate webhook verified",
    "Amount verification verified",
  ],
  razorpay_refund: [
    "Captured payment exists",
    "Refund endpoint tested",
    "Refund initiated",
    "Refund processed webhook received",
    "Refund status updated",
    "Refund amount verified",
    "Duplicate refund protection verified",
  ],
  shiprocket: [
    "Shiprocket account created",
    "Credentials configured",
    "Pickup/warehouse configured",
    "Courier/carrier configuration completed",
    "Authentication tested",
    "Shipment creation tested",
    "AWB assignment tested",
    "Tracking tested",
    "Real webhook configured",
    "Real webhook payload verified",
    "Status mapping verified",
    "RTO behavior verified",
    "Cancellation behavior verified",
  ],
  email: ["Provider selected", "Credentials configured", "Sender email configured", "Sender/domain verified", "Test email delivered", "Production templates verified"],
  whatsapp: [
    "Provider selected",
    "Business account configured",
    "Phone number configured",
    "Templates approved",
    "Credentials configured",
    "Test WhatsApp delivered",
    "Production templates verified",
  ],
};
