import "server-only";
import { emailProvider as consoleEmailProvider } from "@/lib/services/notifications/providers/email";
import { whatsappProvider as consoleWhatsappProvider } from "@/lib/services/notifications/providers/whatsapp";
import type { NotificationChannelProvider } from "@/lib/services/notifications/types";

/**
 * Provider-selection seam (Module 23 Parts 11/12) — reads EMAIL_PROVIDER /
 * WHATSAPP_PROVIDER so a real provider can be activated later purely by
 * config, without touching index.ts's event-wiring. Only "console" (or
 * unset, which defaults to it) has an implementation today — no real
 * Resend/SES/SendGrid/SMTP or Meta/Twilio WhatsApp adapter exists, per this
 * module's explicit "do not install a provider SDK / do not activate a
 * paid provider without approval" constraint. Selecting any other value is
 * a configuration error, not a silent fallback to console — a real
 * deployment that misconfigures this should fail loudly, not quietly keep
 * printing to the server console.
 */
export function getEmailProvider(): NotificationChannelProvider {
  const selected = process.env.EMAIL_PROVIDER || "console";
  if (selected === "console") return consoleEmailProvider;
  throw new Error(`EMAIL_PROVIDER="${selected}" has no implementation yet. Only "console" is currently supported.`);
}

export function getWhatsAppProvider(): NotificationChannelProvider {
  const selected = process.env.WHATSAPP_PROVIDER || "console";
  if (selected === "console") return consoleWhatsappProvider;
  throw new Error(`WHATSAPP_PROVIDER="${selected}" has no implementation yet. Only "console" is currently supported.`);
}
