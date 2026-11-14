import "server-only";
import type { NotificationChannelProvider, SendNotificationParams } from "@/lib/services/notifications/types";
import { renderTemplatePreview } from "@/lib/services/notifications/providers/template-preview";

/** Keeps the country code and last 2 digits, masks everything between —
 *  enough to recognize "is this the right number" in a log without
 *  printing the full number in plaintext. */
export function maskPhone(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  if (digitsOnly.length <= 5) return "•".repeat(digitsOnly.length);
  const prefix = digitsOnly.slice(0, digitsOnly.startsWith("+") ? 3 : 2);
  const suffix = digitsOnly.slice(-2);
  return `${prefix}${"•".repeat(digitsOnly.length - prefix.length - 2)}${suffix}`;
}

/**
 * Stub — logs instead of sending, but logs everything a real WhatsApp
 * Business API call would need, so swapping in a real provider later is a
 * pure plumbing change (same shape of data, just an HTTP call instead of a
 * console.log). No paid vendor is assumed or hard-coded here — see
 * NotificationChannelProvider in types.ts for the interface a real
 * implementation would satisfy.
 */
class ConsoleWhatsAppProvider implements NotificationChannelProvider {
  channel = "whatsapp" as const;

  async send(params: SendNotificationParams): Promise<void> {
    const maskedPhone = params.to.phone ? maskPhone(params.to.phone) : "(no phone)";
    console.log(
      `[notifications:whatsapp] event=${params.eventType ?? "(none)"} template="${params.template}" to=${maskedPhone}\n` +
        `  variables: ${JSON.stringify(params.data)}\n` +
        `  message preview: ${renderTemplatePreview(params.template, params.data)}`
    );
  }
}

export const whatsappProvider = new ConsoleWhatsAppProvider();
